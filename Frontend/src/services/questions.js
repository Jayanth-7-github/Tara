// Questions data for the assessment
export const questions = [
  {
    id: 1,
    type: "mcq",
    text: "What is polymorphism in object-oriented programming?",
    options: [
      "The ability of different objects to respond to the same method call",
      "Creating multiple instances of a class",
      "Inheriting properties from a parent class",
      "Encapsulating data within a class",
    ],
    correctAnswer: 0, // Index of correct answer (not shown to user)
  },
  {
    id: 2,
    type: "mcq",
    text: "Which type of polymorphism is resolved at compile time?",
    options: [
      "Method overloading",
      "Method overriding",
      "Interface implementation",
      "Dynamic binding",
    ],
    correctAnswer: 0,
  },
  {
    id: 3,
    type: "mcq",
    text: "What is method overriding?",
    options: [
      "A subclass provides a specific implementation of a method already defined in its superclass",
      "Multiple methods with the same name but different parameters",
      "Creating new methods in a class",
      "Hiding superclass methods",
    ],
    correctAnswer: 0,
  },
  {
    id: 4,
    type: "mcq",
    text: "In Java, which keyword is used to achieve runtime polymorphism?",
    options: ["extends", "implements", "static", "final"],
    correctAnswer: 0,
  },
  {
    id: 5,
    type: "mcq",
    text: "What is the output when a subclass method is called through a superclass reference?",
    options: [
      "The subclass method is executed (dynamic binding)",
      "The superclass method is executed",
      "Compilation error",
      "Runtime exception",
    ],
    correctAnswer: 0,
  },
  {
    id: 6,
    type: "mcq",
    text: "Which of the following is an example of compile-time polymorphism?",
    options: [
      "Method overloading",
      "Method overriding",
      "Virtual functions",
      "Abstract classes",
    ],
    correctAnswer: 0,
  },
  {
    id: 7,
    type: "mcq",
    text: "Can we achieve polymorphism without inheritance?",
    options: [
      "Yes, through interfaces",
      "No, inheritance is mandatory",
      "Only in JavaScript",
      "Only with abstract classes",
    ],
    correctAnswer: 0,
  },
  {
    id: 8,
    type: "mcq",
    text: "What is the difference between overloading and overriding?",
    options: [
      "Overloading is compile-time, overriding is runtime",
      "Overloading is runtime, overriding is compile-time",
      "Both are compile-time polymorphism",
      "Both are runtime polymorphism",
    ],
    correctAnswer: 0,
  },
  {
    id: 9,
    type: "mcq",
    text: "Which polymorphism type allows a single interface to represent different data types?",
    options: [
      "Parametric polymorphism (Generics)",
      "Ad-hoc polymorphism",
      "Subtype polymorphism",
      "Coercion polymorphism",
    ],
    correctAnswer: 0,
  },
  {
    id: 10,
    type: "mcq",
    text: "In polymorphism, what does 'late binding' mean?",
    options: [
      "Method calls are resolved at runtime",
      "Method calls are resolved at compile time",
      "Variables are declared late in the code",
      "Objects are created dynamically",
    ],
    correctAnswer: 0,
  },
];

export const codingQuestions = [
  {
    id: 11,
    type: "coding",
    text: "Write a program to add two numbers.",
    marks: 20,
    initialCode: "#include <iostream>\n\nint sum(int a, int b) {\n    // Write your code here\n    return 0;\n}\n\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    std::cout << sum(a, b);\n    return 0;\n}",
    testCases: [
      { input: "2 3", expected: "5" },
      { input: "10 20", expected: "30" },
      { input: "-5 5", expected: "0" },
      { input: "100 200", expected: "300" },
      { input: "7 7", expected: "14" },
      { input: "1 0", expected: "1" },
      { input: "0 0", expected: "0" },
      { input: "-10 -20", expected: "-30" },
      { input: "99 1", expected: "100" },
      { input: "50 50", expected: "100" }
    ],
    example: { input: "2 3", output: "5" },
    language: "c++"
  },
  {
    id: 12,
    type: "coding",
    text: "Write a program to check if a number is a Palindrome.",
    marks: 20,
    initialCode: "#include <iostream>\n\nbool isPalindrome(int n) {\n    // Write your code here\n    return false;\n}\n\nint main() {\n    int n;\n    std::cin >> n;\n    std::cout << (isPalindrome(n) ? \"true\" : \"false\");\n    return 0;\n}",
    testCases: [
      { input: "121", expected: "true" },
      { input: "123", expected: "false" },
      { input: "1001", expected: "true" },
      { input: "12321", expected: "true" },
      { input: "10", expected: "false" },
      { input: "1", expected: "true" },
      { input: "11", expected: "true" },
      { input: "1221", expected: "true" },
      { input: "987", expected: "false" },
      { input: "5555", expected: "true" }
    ],
    example: { input: "121", output: "true" },
    language: "c++"
  },
  {
    id: 13,
    type: "coding",
    text: "Write a program to find the Factorial of a number.",
    marks: 20,
    initialCode: "#include <iostream>\n\nlong long factorial(int n) {\n    // Write your code here\n    return 0;\n}\n\nint main() {\n    int n;\n    std::cin >> n;\n    std::cout << factorial(n);\n    return 0;\n}",
    testCases: [
      { input: "5", expected: "120" },
      { input: "0", expected: "1" },
      { input: "1", expected: "1" },
      { input: "3", expected: "6" },
      { input: "6", expected: "720" },
      { input: "10", expected: "3628800" },
      { input: "4", expected: "24" },
      { input: "2", expected: "2" },
      { input: "7", expected: "5040" },
      { input: "8", expected: "40320" }
    ],
    example: { input: "5", output: "120" },
    language: "c++"
  }
];

// Function to get questions without correct answers (for displaying to user)
export const getQuestionsForUser = (type = 'mcq') => {
  if (type === 'coding') {
    return codingQuestions;
  }
  return questions.map(({ correctAnswer, ...question }) => question);
};

export const getMCQQuestionsForUser = () => {
  return questions.map(({ correctAnswer, ...question }) => question);
}

export const getCodingQuestionsForUser = () => {
  return codingQuestions;
}

// Function to get correct answers map (for backend validation)
export const getCorrectAnswers = () => {
  const answersMap = {};
  questions.forEach((q) => {
    answersMap[q.id] = q.correctAnswer;
  });
  return answersMap;
};

// Function to get a specific question by id
export const getQuestionById = (id) => {
  return questions.find((q) => q.id === id);
};

// Function to get total number of questions
export const getTotalQuestions = () => {
  return questions.length;
};

// Function to shuffle questions (optional - for randomized tests)
export const getShuffledQuestions = () => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
