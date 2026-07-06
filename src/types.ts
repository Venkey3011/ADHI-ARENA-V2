export interface User {
  id: string;
  username: string;
  batch: string;
  department?: string;
  student_id?: string;
  role: 'admin' | 'student';
}

export interface Test {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  target_batch: string;
  is_published: number;
  negative_marks: number;
  created_at: string;
  type: 'mcq' | 'coding';
  allowed_languages?: string[];
  start_time?: string;
  end_time?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface CodingProblem {
  id: string;
  test_id: string;
  title: string;
  description: string;
  constraints: string;
  input_format: string;
  output_format: string;
  sample_input: string;
  sample_output: string;
  test_cases: TestCase[];
}

export interface CodingResultDetail {
  problem_id: string;
  problem_title?: string;
  status: string;
  solution_code: string;
  language: string;
  test_cases_passed: number;
  total_test_cases: number;
  test_case_results?: Array<{
    id: string;
    status: 'Passed' | 'Failed' | 'Error';
    actual_output?: string;
    error_message?: string;
    is_hidden: boolean;
    input?: string;
    expected_output?: string;
  }>;
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  option_index: number;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  image_url?: string;
  correct_option_index: number;
  options: Option[];
  explanation?: string;
}

export interface QuestionBank {
  id: string;
  title: string;
  created_at: string;
}

export interface CodingQuestionBank {
  id: string;
  title: string;
  created_at: string;
}

export interface BankCodingProblem {
  id: string;
  bank_id: string;
  title: string;
  description: string;
  constraints: string;
  input_format: string;
  output_format: string;
  sample_input: string;
  sample_output: string;
  test_cases: TestCase[];
}

export interface BankQuestion {
  id: string;
  bank_id: string;
  question_text: string;
  image_url?: string;
  correct_option_index: number;
  options: Option[];
  explanation?: string;
}

export interface Result {
  id: string;
  test_id: string;
  test_title: string;
  student_name: string;
  student_id: string;
  score: number;
  total_questions: number;
  responses?: string; // JSON string of student answers
  coding_details?: CodingResultDetail[];
  test_type?: 'mcq' | 'coding';
  completed_at: string;
}
