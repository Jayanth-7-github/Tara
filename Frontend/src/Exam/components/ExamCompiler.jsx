import React, { useState, useEffect } from "react";

export default function ExamCompiler({
  questionId = "default",
  initialCode = "// Write your code here...",
  language = "javascript",
  testCases = [],
  onStatusUpdate,
  onRun,
  initialPassed = null,
  // When true, allow normal copy/paste/cut behaviour in the editor and input areas.
  // Defaults to false so exam pages keep clipboard restrictions.
  allowCopyPaste = false,
}) {
  const [code, setCode] = useState(initialCode);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [testResults, setTestResults] = useState({});
  const [isFooterExpanded, setIsFooterExpanded] = useState(true);
  const [activeFooterTab, setActiveFooterTab] = useState("run");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);
  const [lastRunTime, setLastRunTime] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const lineNumberRef = React.useRef(null);
  const textareaRef = React.useRef(null);

  // Autosave code
  // Autosave code and language
  useEffect(() => {
    // 1. Get saved language or fallback to default prop
    const savedLang = localStorage.getItem("exam_language") || language;
    setSelectedLanguage(savedLang);

    // 2. Load code for that specific question and language
    const key = `exam_code_${questionId}_${savedLang}`;
    const savedCode = localStorage.getItem(key);

    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(initialCode);
    }
  }, [questionId]);

  useEffect(() => {
    // Save to question + language specific key
    const key = `exam_code_${questionId}_${selectedLanguage}`;
    localStorage.setItem(key, code);
  }, [code, selectedLanguage, questionId]);

  useEffect(() => {
    localStorage.setItem("exam_language", selectedLanguage);
  }, [selectedLanguage]);



  const templates = {
    c: `#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}`,
    "c++": `#include <iostream>\n\nint main() {\n    std::cout << "Hello World!";\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`,
    python: `print("Hello World")`,
    javascript: `console.log("Hello World");`,
  };

  const EXEC_TIMEOUT_MS = 20000; // 20 seconds safety timeout for remote execution

  const langMap = {
    "c++": "cpp",
    cpp: "cpp",
    c: "c",
    java: "java",
    python: "python",
    python3: "python",
    javascript: "javascript",
    js: "javascript",
  };

  const getApiLangAndVersion = () => {
    const apiLang =
      langMap[selectedLanguage.toLowerCase()] || selectedLanguage.toLowerCase();
    const version =
      apiLang === "cpp" || apiLang === "c"
        ? "10.2.0"
        : apiLang === "java"
          ? "15.0.2"
          : apiLang === "python"
            ? "3.10.0"
            : "18.15.0";
    return { apiLang, version };
  };

  const executeWithTimeout = async (stdin) => {
    const { apiLang, version } = getApiLangAndVersion();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXEC_TIMEOUT_MS);

    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          language: apiLang,
          version: version,
          files: [{ content: code }],
          stdin,
        }),
      });
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const executeWithRetry = async (stdin, retries = 1) => {
    try {
      return await executeWithTimeout(stdin);
    } catch (e) {
      if (retries > 0) {
        return executeWithRetry(stdin, retries - 1);
      }
      throw e;
    }
  };

  const canRun = () => {
    const now = Date.now();
    if (now - lastRunTime < 2000) {
      setOutput("Please wait before running again.");
      return false;
    }
    setLastRunTime(now);
    return true;
  };

  const checkSecurity = (codeStr, inputStr) => {
    if (codeStr.length > 20000) return "Code too long.";
    if (inputStr && inputStr.length > 5000) return "Input too large.";

    const blockedPatterns = [
      /while\s*\(\s*true\s*\)/,
      /fork\s*\(/,
      /system\s*\(/,
      /exec\s*\(/,
    ];

    for (let pattern of blockedPatterns) {
      if (pattern.test(codeStr)) {
        return "Potentially unsafe code detected.";
      }
    }
    return null;
  };

  const handleRun = async () => {
    const securityError = checkSecurity(code, input);
    if (securityError) {
      setOutput(securityError);
      return;
    }

    if (!canRun()) return;

    setIsRunning(true);
    setOutput("Running...");

    // Notify parent of code update (no test results yet)
    if (onStatusUpdate) {
      const isMatch = code === initialCode;
      onStatusUpdate({ code, passed: isMatch ? initialPassed : null });
    }
    if (typeof onRun === "function") onRun(code);

    const start = Date.now();

    try {
      const data = await executeWithRetry(input);
      const time = Date.now() - start;

      let resultOutput = "";
      if (data.compile && data.compile.stderr) {
        resultOutput = `Compilation Error:\n${data.compile.stderr}`;
      } else if (data.run && data.run.stderr) {
        resultOutput = `Runtime Error:\n${data.run.stderr}`;
      } else if (data.run) {
        resultOutput = data.run.output || "No output returned.";
      } else {
        resultOutput = `Error: ${data.message || "Unknown error occurred"}`;
      }

      setOutput(`${resultOutput}\n\nExecuted in ${time} ms`);
    } catch (error) {
      if (error.name === "AbortError") {
        setOutput(
          "Execution timed out. Please try again or check your network connection.",
        );
      } else {
        setOutput(`Execution failed: ${error.message}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTestCases = async () => {
    if (testCases.length === 0) return;

    const securityError = checkSecurity(code, "");
    if (securityError) {
      setOutput(securityError);
      return;
    }

    if (!canRun()) return;

    setIsRunning(true);
    setOutput("Running test cases...\n");
    setTestResults({});

    const newResults = {};
    let allPassed = true;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      setOutput((prev) => prev + `\nTest Case ${i + 1}: Running...`);

      try {
        const data = await executeWithRetry(tc.input);

        if (!data.run) {
          throw new Error(data.message || "Execution failed");
        }

        const actualOutput = (data.run.output || "").trim();
        const expectedOutput = (tc.expected || "").trim();
        const passed = actualOutput === expectedOutput;

        if (!passed) allPassed = false;

        newResults[i] = { success: passed, actual: actualOutput };

        setOutput((prev) => prev + (passed ? " PASSED" : " FAILED"));
        if (!passed) {
          setOutput(
            (prev) =>
              prev +
              `\n   Expected: ${expectedOutput}\n   Actual:   ${actualOutput}\n`,
          );
        }
      } catch (error) {
        allPassed = false;
        const message =
          error.name === "AbortError"
            ? "Execution timed out. Please try again or check your network connection."
            : error.message;
        newResults[i] = { success: false, error: message };
        setOutput((prev) => prev + ` ERROR: ${message}\n`);
      }
    }

    setTestResults(newResults);
    setOutput(
      (prev) =>
        prev +
        `\n\nResult: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`,
    );
    setIsRunning(false);

    const passedCount = Object.values(newResults).filter(
      (r) => r.success,
    ).length;
    if (onStatusUpdate) {
      onStatusUpdate({ code, passed: passedCount });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+Enter or Cmd+Enter to Run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRunTestCases();
        } else {
          handleRun();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun, handleRunTestCases]);

  const handleScroll = (e) => {
    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const newLang = e.target.value;
              localStorage.setItem(
                `exam_code_${questionId}_${selectedLanguage}`,
                code,
              );

              setSelectedLanguage(newLang);

              // Load saved code for this question + new language
              const savedCode = localStorage.getItem(
                `exam_code_${questionId}_${newLang}`,
              );
              if (savedCode) {
                setCode(savedCode);
              } else {
                setCode(templates[newLang.toLowerCase()] || "");
              }
            }}
            className="bg-gray-700 text-gray-200 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 uppercase tracking-wide"
          >
            <option value="c">C</option>
            <option value="c++">C++</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">NodeJS</option>
          </select>

          {/* Font Size Control */}
          <div className="flex items-center bg-gray-700 rounded border border-gray-600 ml-2">
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              className="px-2 py-0.5 text-gray-300 hover:text-white hover:bg-gray-600 border-r border-gray-600 text-xs"
            >
              -
            </button>
            <span className="px-2 text-xs text-gray-300 w-8 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              className="px-2 py-0.5 text-gray-300 hover:text-white hover:bg-gray-600 border-l border-gray-600 text-xs"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setCode(templates[selectedLanguage.toLowerCase()] || "")
            }
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Line Numbers */}
        <div
          ref={lineNumberRef}
          className="bg-[#1e1e1e] text-gray-600 text-right pr-3 pt-4 select-none overflow-hidden border-r border-gray-800"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.625", // Match textarea leading-relaxed
            minWidth: "3rem",
            fontFamily: "monospace",
          }}
        >
          {code.split("\n").map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            const val = e.target.value;
            setCode(val);
            if (onStatusUpdate) {
              const isMatch = val === initialCode;
              onStatusUpdate({
                code: val,
                passed: isMatch ? initialPassed : null,
              });
            }
          }}
          onScroll={handleScroll}
          onPaste={
            allowCopyPaste
              ? undefined
              : (e) => {
                e.preventDefault();
              }
          }
          onCopy={
            allowCopyPaste
              ? undefined
              : (e) => {
                e.preventDefault();
              }
          }
          onCut={
            allowCopyPaste
              ? undefined
              : (e) => {
                e.preventDefault();
              }
          }
          onKeyDown={(e) => {
            // 1. Allow undo/redo (let browser handle it)
            if (
              ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") ||
              ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
            ) {
              return;
            }

            const val = e.target.value;
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;

            // Helper to get line start/end indices
            const getLineRange = (index) => {
              const lineStart = val.lastIndexOf("\n", index - 1) + 1;
              let lineEnd = val.indexOf("\n", index);
              if (lineEnd === -1) lineEnd = val.length;
              return { start: lineStart, end: lineEnd };
            };

            // Wrap selected text with quotes or brackets
            const wrapPairs = {
              '"': '"',
              "'": "'",
              "(": ")",
              "{": "}",
              "[": "]",
            };

            if (wrapPairs[e.key]) {
              if (start !== end) {
                e.preventDefault();

                const selected = val.substring(start, end);
                const open = e.key;
                const close = wrapPairs[e.key];

                // Use native insert so undo/redo works
                document.execCommand(
                  "insertText",
                  false,
                  open + selected + close,
                );

                setTimeout(() => {
                  e.target.selectionStart = start + 1;
                  e.target.selectionEnd = end + 1;
                }, 0);

                return;
              }
            }

            // 0. Handle Commenting (Ctrl + /)
            if ((e.ctrlKey || e.metaKey) && e.key === "/") {
              e.preventDefault();

              // Determine comment symbol based on language
              let commentSymbol = "//";
              if (
                selectedLanguage === "python" ||
                selectedLanguage === "python3"
              ) {
                commentSymbol = "#";
              }

              // Expand selection to cover full lines
              const startRange = getLineRange(start);
              const endRange = getLineRange(end > start ? end - 1 : end); // handle end at start of next line properly

              const selectionStart = startRange.start;
              const selectionEnd = endRange.end;

              const selectedText = val.substring(selectionStart, selectionEnd);
              const lines = selectedText.split("\n");

              // Determine if we should comment or uncomment
              // If *all* lines are commented, we uncomment. Otherwise, we comment all.
              const allCommented = lines.every((line) => {
                const trimmed = line.trim();
                return (
                  trimmed.length === 0 || trimmed.startsWith(commentSymbol)
                );
              });

              const newLines = lines.map((line) => {
                if (allCommented) {
                  // Uncomment: remove the first occurrence of `// ` or `//` (or `#` etc)
                  // We use a regex dealing with optional space after symbol
                  const escapedSymbol =
                    commentSymbol === "//" ? "\\/\\/" : commentSymbol;
                  const regex = new RegExp(`^(\\s*)${escapedSymbol}\\s?`);
                  return line.replace(regex, "$1");
                } else {
                  // Comment: add symbol at the start of indentation
                  if (line.trim().length === 0) return line; // don't comment empty lines
                  return line.replace(/^(\s*)(.*)/, `$1${commentSymbol} $2`);
                }
              });

              const newText = newLines.join("\n");
              const newValue =
                val.substring(0, selectionStart) +
                newText +
                val.substring(selectionEnd);

              setCode(newValue);

              // Select the modified lines
              setTimeout(() => {
                e.target.selectionStart = selectionStart;
                e.target.selectionEnd = selectionStart + newText.length;
              }, 0);
              return;
            }

            // 1. Handle Tab (Indentation)
            if (e.key === "Tab") {
              e.preventDefault();

              const indent = "    "; // 4 spaces

              // Find start of first selected line
              const lineStart = val.lastIndexOf("\n", start - 1) + 1;

              // Find end of last selected line
              const lineEndIndex = val.indexOf("\n", end);
              const lineEnd = lineEndIndex === -1 ? val.length : lineEndIndex;

              const before = val.substring(0, lineStart);
              const selection = val.substring(lineStart, lineEnd);
              const after = val.substring(lineEnd);

              const lines = selection.split("\n");

              let updatedLines;
              let newStart = start;
              let newEnd = end;

              if (e.shiftKey) {
                // SHIFT + TAB → OUTDENT
                updatedLines = lines.map((line) => {
                  if (line.startsWith(indent)) {
                    newEnd -= indent.length;
                    if (lineStart < start) newStart -= indent.length;
                    return line.slice(indent.length);
                  } else if (line.startsWith("  ")) {
                    newEnd -= 2;
                    if (lineStart < start) newStart -= 2;
                    return line.slice(2);
                  } else if (line.startsWith(" ")) {
                    newEnd -= 1;
                    if (lineStart < start) newStart -= 1;
                    return line.slice(1);
                  }
                  return line;
                });
              } else {
                // TAB → INDENT
                updatedLines = lines.map((line) => indent + line);
                newEnd += indent.length * lines.length;
                if (lineStart < start) newStart += indent.length;
              }

              const newSelection = updatedLines.join("\n");
              const newValue = before + newSelection + after;

              setCode(newValue);

              // Restore selection
              setTimeout(() => {
                e.target.selectionStart = newStart;
                e.target.selectionEnd = newEnd;
              }, 0);

              return;
            }

            // 2. Handle Enter (Auto-indent)
            if (e.key === "Enter") {
              e.preventDefault();

              // Check for Smart Bracket Enter: { | } -> Enter -> { \n    | \n }
              if (val[start - 1] === "{" && val[end] === "}") {
                const lineStart = val.lastIndexOf("\n", start - 1) + 1;
                const currentLine = val.substring(lineStart, start);
                const indentMatch = currentLine.match(/^\s*/);
                const currentIndent = indentMatch ? indentMatch[0] : "";
                const extraIndent = "    ";

                const newValue =
                  val.substring(0, start) +
                  "\n" +
                  currentIndent +
                  extraIndent +
                  "\n" +
                  currentIndent +
                  val.substring(end);
                setCode(newValue);
                setTimeout(() => {
                  e.target.selectionStart = e.target.selectionEnd =
                    start + 1 + currentIndent.length + extraIndent.length;
                }, 0);
                return;
              }

              // Standard Auto-indent
              const lineStart = val.lastIndexOf("\n", start - 1) + 1;
              const currentLine = val.substring(lineStart, start);
              const indentMatch = currentLine.match(/^\s*/);
              let indent = indentMatch ? indentMatch[0] : "";

              if (
                currentLine.trim().endsWith("{") ||
                currentLine.trim().endsWith("(") ||
                currentLine.trim().endsWith("[") ||
                currentLine.trim().endsWith(":") // useful for python
              ) {
                indent += "    ";
              }

              const newValue =
                val.substring(0, start) + "\n" + indent + val.substring(end);
              setCode(newValue);
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd =
                  start + 1 + indent.length;
              }, 0);
              return;
            }

            // 3. Handle Closing Bracket (Auto-outdent)
            if (e.key === "}" || e.key === "]" || e.key === ")") {
              // Check if we are on a line with just indentation
              const lineStart = val.lastIndexOf("\n", start - 1) + 1;
              const currentLine = val.substring(lineStart, start);

              // If current line is just whitespace and matches indentation size
              // We want to outdent this line before inserting the brace
              if (/^\s+$/.test(currentLine) && currentLine.length >= 4) {
                if (currentLine.endsWith("    ")) {
                  const newIndent = currentLine.slice(0, -4);
                  const newValue =
                    val.substring(0, lineStart) +
                    newIndent +
                    e.key +
                    val.substring(end);
                  setCode(newValue);
                  e.preventDefault();
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd =
                      lineStart + newIndent.length + 1;
                  }, 0);
                  return;
                }
              }
              // Also handle closing pairs (overwrite if next char is same)
              if (val[start] === e.key) {
                e.preventDefault();
                setTimeout(() => {
                  e.target.selectionStart = e.target.selectionEnd = start + 1;
                }, 0);
                return;
              }
            }

            // 4. Handle Opening Brackets (Auto-close)
            const pairs = {
              "(": ")",
              "{": "}",
              "[": "]",
              '"': '"',
              "'": "'",
            };

            if (pairs[e.key]) {
              e.preventDefault();
              const newValue =
                val.substring(0, start) +
                e.key +
                pairs[e.key] +
                val.substring(end);
              setCode(newValue);
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 1;
              }, 0);
              return;
            }
          }}
          className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono p-4 resize-none focus:outline-none leading-relaxed scrollbar-thin-dark"
          spellCheck="false"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.625",
          }}
        />
      </div>

      {/* Footer / Console */}
      <div
        className={`${isFooterExpanded ? "h-1/2" : "h-10"} bg-[#151515] border-t border-gray-700 flex flex-col transition-all duration-300`}
      >
        {/* Tab Header */}
        <div className="flex items-center justify-between bg-gray-200 dark:bg-[#1e1e1e] border-b border-gray-700 h-10 px-2 shrink-0">
          <div className="flex h-full">
            {["run", "tests", "hints"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveFooterTab(tab);
                  setIsFooterExpanded(true);
                }}
                className={`px-4 h-full text-xs font-bold uppercase tracking-wide border-r border-gray-700 transition-colors ${activeFooterTab === tab
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-t-2 border-t-blue-500"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                  }`}
              >
                {tab === "run"
                  ? "Run"
                  : tab === "tests"
                    ? "Run Tests"
                    : "Hints"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsFooterExpanded(!isFooterExpanded)}
            className="p-2 text-gray-400 hover:text-white transition-transform"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isFooterExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-black scrollbar-thin-dark">
          {activeFooterTab === "run" && (
            <div className="flex flex-col h-full p-4 overflow-y-auto scrollbar-thin-dark">
              {/* Run Actions */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-sm text-sm font-bold shadow-md transition-all ${isRunning
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    }`}
                >
                  {isRunning ? "Running..." : "Run Code"}
                </button>
                <div className="text-gray-500 text-xs italic">
                  {isRunning ? "Executing..." : "Ready"}
                </div>
              </div>

              {/* Input */}
              <div className="mb-4 flex-1 flex flex-col min-h-[100px]">
                <label className="text-xs font-bold text-gray-400 mb-2 block">
                  Input
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={
                    allowCopyPaste
                      ? undefined
                      : (e) => {
                        e.preventDefault();
                      }
                  }
                  onCopy={
                    allowCopyPaste
                      ? undefined
                      : (e) => {
                        e.preventDefault();
                      }
                  }
                  onCut={
                    allowCopyPaste
                      ? undefined
                      : (e) => {
                        e.preventDefault();
                      }
                  }
                  placeholder="Enter your input here..."
                  className="w-full h-full bg-[#1e1e1e] border border-gray-700 rounded-sm p-3 text-sm text-gray-300 focus:outline-none focus:border-gray-500 font-mono resize-none"
                  spellCheck="false"
                />
              </div>

              {/* Output (Only if there is output) */}
              <div className="flex-1 flex flex-col min-h-[100px]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-400 block">
                    Output
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(output);
                      alert("Output copied!");
                    }}
                    className="text-xs text-gray-500 hover:text-white transition-colors mr-3"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setOutput("")}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <pre className="w-full h-full bg-[#1e1e1e] border border-gray-700 rounded-sm p-3 text-sm text-gray-300 font-mono overflow-y-auto whitespace-pre-wrap">
                  {output || (
                    <span className="text-gray-600 italic">
                      Output will appear here...
                    </span>
                  )}
                </pre>
              </div>
            </div>
          )}

          {activeFooterTab === "tests" && (
            <div className="flex flex-col h-full bg-[#151515] relative">
              {/* Results Banner */}
              {Object.keys(testResults).length > 0 && (
                <div
                  className={`px-4 py-2 flex justify-between items-center text-sm font-bold border-b ${Object.values(testResults).every((r) => r.success)
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-red-100 text-red-700 border-red-200"
                    }`}
                >
                  <span className="flex-1 text-center">
                    You have passed{" "}
                    {Object.values(testResults).filter((r) => r.success).length}
                    /{testCases.length} tests
                  </span>
                  <button
                    onClick={() => setTestResults({})}
                    className="text-xs underline hover:no-underline opacity-70"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Run Button & Case List */}
                <div className="w-48 bg-[#1e1e1e] border-r border-gray-700 flex flex-col">
                  <div className="p-4 border-b border-gray-700">
                    <button
                      onClick={handleRunTestCases}
                      disabled={isRunning}
                      className={`w-full py-2 rounded text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${isRunning
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                        }`}
                    >
                      {isRunning ? (
                        <svg
                          className="animate-spin w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="opacity-25"
                          />
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            className="opacity-75"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      Run Tests
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin-dark">
                    {testCases.slice(0, 2).map((tc, i) => {
                      const res = testResults[i];
                      const isPass = res?.success;
                      const isFail = res && !res.success;
                      const isActive = activeTestCaseIndex === i;

                      return (
                        <div
                          key={i}
                          onClick={() => setActiveTestCaseIndex(i)}
                          className={`px-4 py-3 cursor-pointer flex justify-between items-center text-sm font-medium border-b border-gray-700/50 transition-colors ${isActive
                            ? "bg-[#2d2d2d] text-white border-l-4 border-l-white"
                            : "text-gray-400 hover:bg-[#252525]"
                            }`}
                        >
                          <span>Test Case {i + 1}</span>
                          {isPass && (
                            <span className="text-green-500 text-lg">✔</span>
                          )}
                          {isFail && (
                            <span className="text-red-500 text-lg">✘</span>
                          )}
                        </div>
                      );
                    })}
                    {testCases.length > 2 && (
                      <div className="px-4 py-3 text-xs text-gray-500 italic border-b border-gray-700/50">
                        + {testCases.length - 2} hidden test cases
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Detail View */}
                <div className="flex-1 bg-[#151515] p-6 overflow-y-auto scrollbar-thin-dark">
                  {testCases.length > 0 ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                      {/* Input Box */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-300 mb-2">
                          Input
                        </h4>
                        <div className="bg-[#1e1e1e] border border-gray-700 p-4 rounded text-gray-300 font-mono text-sm whitespace-pre-wrap">
                          {testCases[activeTestCaseIndex]?.input}
                        </div>
                      </div>

                      {/* Expected Output Box */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-300 mb-2">
                          Expected Output
                        </h4>
                        <div className="bg-[#1e1e1e] border border-gray-700 p-4 rounded text-gray-300 font-mono text-sm whitespace-pre-wrap">
                          {testCases[activeTestCaseIndex]?.expected}
                        </div>
                      </div>

                      {/* Actual Output Box (if run) */}
                      {testResults[activeTestCaseIndex] && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-2">
                            Actual Output
                          </h4>
                          <div
                            className={`border p-4 rounded text-sm font-mono whitespace-pre-wrap ${testResults[activeTestCaseIndex].success
                              ? "bg-green-900/10 border-green-800 text-green-300"
                              : "bg-red-900/10 border-red-800 text-red-300"
                              }`}
                          >
                            {testResults[activeTestCaseIndex].actual ||
                              testResults[activeTestCaseIndex].error || (
                                <span className="italic opacity-50">
                                  Empty output
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 mt-10">
                      No test cases available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeFooterTab === "hints" && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-12 h-12 mb-2 opacity-20"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm">No hints available for this problem.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
