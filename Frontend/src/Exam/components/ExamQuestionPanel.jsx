import React from "react";

export default function ExamQuestionPanel({
  currentQuestion,
  questions,
  answers,
  markedForReview,
  selectAnswer,
  toggleMarkForReview,
  currentIndex,
  setCurrentIndex,
  error,
}) {
  return (
    <div className="max-w-4xl mx-auto px-10 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="text-sm flex items-center gap-2 cursor-pointer transition-colors"
            onClick={() => toggleMarkForReview(currentQuestion.id)}
          >
            <span
              className={`inline-flex w-5 h-5 border-2 rounded items-center justify-center transition-colors ${
                markedForReview[currentQuestion.id]
                  ? "bg-orange-500 border-orange-500"
                  : "border-gray-400 hover:border-gray-600"
              }`}
            >
              {markedForReview[currentQuestion.id] && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            <span
              className={`font-medium ${
                markedForReview[currentQuestion.id]
                  ? "text-orange-700"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {markedForReview[currentQuestion.id]
                ? "Marked for review"
                : "Mark for review"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <div className="px-3 py-1.5 bg-green-50 border-2 border-green-400 text-green-700 rounded-lg shadow-sm">
            +1
          </div>
          <div className="px-3 py-1.5 bg-red-50 border-2 border-red-400 text-red-700 rounded-lg shadow-sm">
            0
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <p className="text-sm font-semibold text-gray-500 mb-3">
          Question {currentQuestion.id} of {questions.length}
        </p>
        <p className="text-lg text-gray-900 leading-relaxed font-medium mb-6">
          {currentQuestion.text}
        </p>
        <hr className="my-6 border-gray-200" />
        <div className="space-y-3">
          {currentQuestion.options.map((opt, index) => {
            const selected = answers[currentQuestion.id] === index;
            return (
              <button
                key={opt}
                onClick={() => selectAnswer(currentQuestion.id, index)}
                className={`w-full text-left px-5 py-4 border-2 rounded-xl text-base flex items-center gap-4 transition-all duration-200 ${
                  selected
                    ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-md"
                    : "bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
                }`}
              >
                <span
                  className={`inline-flex w-5 h-5 border-2 rounded-full items-center justify-center shrink-0 transition-colors ${
                    selected ? "border-blue-600 bg-blue-100" : "border-gray-400"
                  }`}
                >
                  {selected && (
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  )}
                </span>
                <span
                  className={`font-medium ${
                    selected ? "text-gray-900" : "text-gray-700"
                  }`}
                >
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className="mt-6 flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors"
          onClick={() => selectAnswer(currentQuestion.id, undefined)}
        >
          <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded hover:border-gray-600 transition-colors" />
          <span className="font-medium">Clear Response</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-6">
        <div>
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className={`px-6 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
              currentIndex === 0
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
            }`}
          >
            Previous
          </button>
        </div>

        <div>
          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() =>
              setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
            }
            className={`px-6 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
              currentIndex === questions.length - 1
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
            }`}
          >
            Next
          </button>
        </div>
      </div>
      {error && (
        <div className="text-red-600 text-sm pt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
