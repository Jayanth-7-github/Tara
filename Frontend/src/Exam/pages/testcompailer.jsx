import React from 'react';
import ExamCompiler from '../components/ExamCompiler';

export default function TestCompiler() {
    return (
        <div className="w-full h-screen bg-gray-100 p-8 flex flex-col">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Compiler Component Test</h1>
            <div className="flex-1 border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
                <ExamCompiler
                    initialCode={`#include <iostream>

int main() {
    std::cout << "Hello World!";
    return 0;
}`}
                    language="C++"
                    testCases={[
                        { input: "10 20", expected: "30" },
                        { input: "5 5", expected: "10" }
                    ]}
                />
            </div>
        </div>
    );
}
