import React, { useState } from "react";

export default function ExamCompiler({
    initialCode = "// Write your code here...",
    language = "javascript",
    testCases = [],
    onRun,
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

    const templates = {
        "c++": `#include <iostream>\n\nint main() {\n    std::cout << "Hello World!";\n    return 0;\n}`,
        "java": `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`,
        "python": `print("Hello World")`,
        "javascript": `console.log("Hello World");`
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput("Running...");

        const langMap = {
            "c++": "cpp",
            "cpp": "cpp",
            "c": "c",
            "java": "java",
            "python": "python",
            "python3": "python",
            "javascript": "javascript",
            "js": "javascript"
        };
        const apiLang = langMap[selectedLanguage.toLowerCase()] || selectedLanguage.toLowerCase();
        const version = apiLang === "cpp" ? "10.2.0" : apiLang === "java" ? "15.0.2" : apiLang === "python" ? "3.10.0" : "18.15.0";

        try {
            const response = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: apiLang,
                    version: version,
                    files: [{ content: code }],
                    stdin: input
                })
            });
            const data = await response.json();

            if (data.run) {
                setOutput(data.run.output || "No output returned.");
            } else {
                setOutput(`Error: ${data.message || "Unknown error occurred"}`);
            }
        } catch (error) {
            setOutput(`Execution failed: ${error.message}`);
        } finally {
            setIsRunning(false);
            if (onRun) onRun(code);
        }
    };

    const handleRunTestCases = async () => {
        if (testCases.length === 0) return;
        setIsRunning(true);
        setOutput("Running test cases...\n");
        setTestResults({});

        const langMap = {
            "c++": "cpp",
            "cpp": "cpp",
            "c": "c",
            "java": "java",
            "python": "python",
            "python3": "python",
            "javascript": "javascript",
            "js": "javascript"
        };
        const apiLang = langMap[selectedLanguage.toLowerCase()] || selectedLanguage.toLowerCase();
        const version = apiLang === "cpp" ? "10.2.0" : apiLang === "java" ? "15.0.2" : apiLang === "python" ? "3.10.0" : "18.15.0";

        const newResults = {};
        let allPassed = true;

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            setOutput(prev => prev + `\nTest Case ${i + 1}: Running...`);

            try {
                const response = await fetch("https://emkc.org/api/v2/piston/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language: apiLang,
                        version: version,
                        files: [{ content: code }],
                        stdin: tc.input
                    })
                });
                const data = await response.json();

                if (!data.run) {
                    throw new Error(data.message || "Execution failed");
                }

                const actualOutput = (data.run.output || "").trim();
                const expectedOutput = (tc.expected || "").trim();
                const passed = actualOutput === expectedOutput;

                if (!passed) allPassed = false;

                newResults[i] = { success: passed, actual: actualOutput };

                setOutput(prev => prev + (passed ? " PASSED" : " FAILED"));
                if (!passed) {
                    setOutput(prev => prev + `\n   Expected: ${expectedOutput}\n   Actual:   ${actualOutput}\n`);
                }

            } catch (error) {
                allPassed = false;
                newResults[i] = { success: false, error: error.message };
                setOutput(prev => prev + ` ERROR: ${error.message}\n`);
            }
        }

        setTestResults(newResults);
        setOutput(prev => prev + `\n\nResult: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
        setIsRunning(false);
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
                            setSelectedLanguage(newLang);
                            setCode(templates[newLang.toLowerCase()] || "");
                        }}
                        className="bg-gray-700 text-gray-200 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 uppercase tracking-wide"
                    >
                        <option value="C++">C++</option>
                        <option value="Java">Java</option>
                        <option value="Python">Python</option>
                        <option value="JavaScript">NodeJS</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCode(templates[selectedLanguage.toLowerCase()] || "")}
                        className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Code Editor Area */}
            <div className="flex-1 relative">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                        const pairs = {
                            "(": ")",
                            "{": "}",
                            "[": "]",
                            "\"": "\"",
                            "'": "'"
                        };

                        if (pairs[e.key]) {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const val = e.target.value;

                            const before = val.substring(0, start);
                            const after = val.substring(end);

                            const newValue = before + e.key + pairs[e.key] + after;

                            setCode(newValue);

                            // Using setTimeout to ensure state update has processed before setting cursor
                            // or better, just use a ref or simple calculation since React state update is async 
                            // but synthetic event properties might be lost. 
                            // For a simple controlled input, we need to defer cursor move.
                            setTimeout(() => {
                                e.target.selectionStart = e.target.selectionEnd = start + 1;
                            }, 0);
                        }
                    }}
                    className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
                    spellCheck="false"
                />
            </div>

            {/* Footer / Console */}
            <div className={`${isFooterExpanded ? "h-1/2" : "h-10"} bg-[#151515] border-t border-gray-700 flex flex-col transition-all duration-300`}>
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
                                {tab === "run" ? "Run" : tab === "tests" ? "Run Tests" : "Hints"}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsFooterExpanded(!isFooterExpanded)}
                        className="p-2 text-gray-400 hover:text-white transition-transform"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isFooterExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-black">
                    {activeFooterTab === "run" && (
                        <div className="flex flex-col h-full p-4 overflow-y-auto">
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
                                <label className="text-xs font-bold text-gray-400 mb-2 block">Input</label>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Enter your input here..."
                                    className="w-full h-full bg-[#1e1e1e] border border-gray-700 rounded-sm p-3 text-sm text-gray-300 focus:outline-none focus:border-gray-500 font-mono resize-none"
                                    spellCheck="false"
                                />
                            </div>

                            {/* Output (Only if there is output) */}
                            <div className="flex-1 flex flex-col min-h-[100px]">
                                <label className="text-xs font-bold text-gray-400 mb-2 block">Output</label>
                                <pre className="w-full h-full bg-[#1e1e1e] border border-gray-700 rounded-sm p-3 text-sm text-gray-300 font-mono overflow-y-auto whitespace-pre-wrap">
                                    {output || <span className="text-gray-600 italic">Output will appear here...</span>}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeFooterTab === "tests" && (
                        <div className="flex flex-col h-full bg-[#151515] relative">
                            {/* Results Banner */}
                            {Object.keys(testResults).length > 0 && (
                                <div className={`px-4 py-2 flex justify-between items-center text-sm font-bold border-b ${Object.values(testResults).every(r => r.success)
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                                    }`}>
                                    <span className="flex-1 text-center">
                                        You have passed {Object.values(testResults).filter(r => r.success).length}/{testCases.length} tests
                                    </span>
                                    <button onClick={() => setTestResults({})} className="text-xs underline hover:no-underline opacity-70">
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
                                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            Run Tests
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {testCases.map((tc, i) => {
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
                                                    {isPass && <span className="text-green-500 text-lg">✔</span>}
                                                    {isFail && <span className="text-red-500 text-lg">✘</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Detail View */}
                                <div className="flex-1 bg-[#151515] p-6 overflow-y-auto">
                                    {testCases.length > 0 ? (
                                        <div className="max-w-3xl mx-auto space-y-6">
                                            {/* Input Box */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-300 mb-2">Input</h4>
                                                <div className="bg-[#1e1e1e] border border-gray-700 p-4 rounded text-gray-300 font-mono text-sm whitespace-pre-wrap">
                                                    {testCases[activeTestCaseIndex]?.input}
                                                </div>
                                            </div>

                                            {/* Expected Output Box */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-300 mb-2">Expected Output</h4>
                                                <div className="bg-[#1e1e1e] border border-gray-700 p-4 rounded text-gray-300 font-mono text-sm whitespace-pre-wrap">
                                                    {testCases[activeTestCaseIndex]?.expected}
                                                </div>
                                            </div>

                                            {/* Actual Output Box (if run) */}
                                            {testResults[activeTestCaseIndex] && (
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-300 mb-2">Actual Output</h4>
                                                    <div className={`border p-4 rounded text-sm font-mono whitespace-pre-wrap ${testResults[activeTestCaseIndex].success
                                                        ? "bg-green-900/10 border-green-800 text-green-300"
                                                        : "bg-red-900/10 border-red-800 text-red-300"
                                                        }`}>
                                                        {testResults[activeTestCaseIndex].actual || testResults[activeTestCaseIndex].error || <span className="italic opacity-50">Empty output</span>}
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
                            <svg className="w-12 h-12 mb-2 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm">No hints available for this problem.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
