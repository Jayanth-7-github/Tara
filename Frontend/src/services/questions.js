// Questions data for the assessment
export const questions = [
  {
    id: 1,
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
    text: "In Java, which keyword is used to achieve runtime polymorphism?",
    options: ["extends", "implements", "static", "final"],
    correctAnswer: 0,
  },
  {
    id: 5,
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

// Function to get all questions
export const getAllQuestions = () => {
  return questions;
};

// Function to get questions without correct answers (for displaying to user)
export const getQuestionsForUser = () => {
  return questions.map(({ correctAnswer, ...question }) => question);
};

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
