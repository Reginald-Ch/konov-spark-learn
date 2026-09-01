-- Four ML-themed Python Challenges, closing the structural gap identified
-- in chat: Module 2 teaches real ML mechanics (gradient descent, decision
-- trees, evaluation, k-fold), but every "build something real and get it
-- graded" surface on this platform (Build Studio, Daily Challenges,
-- Hackathons) is chatbot/agent-only. A student who loves Module 2 has
-- nowhere to actually WRITE real ML code and have it executed and graded --
-- every hands-on moment in the module itself is either watching a pre-baked
-- demo or filling in one line of an already-finished script.
--
-- Fix reuses existing infrastructure rather than building anything new:
-- Python Challenges already runs a student's real function against real
-- test inputs through the actual interpreter and compares the output --
-- exactly what was missing. These four challenges are the exact functions
-- already taught in Module 2's own lesson code (gini, gradient descent's
-- update rule, the ensemble's majority vote) plus one (fold_sizes) that
-- deliberately goes one step past the lesson's own code, which never
-- handled the remainder-distribution case. Every reference solution and
-- every expected_output below was verified against a real Node.js
-- simulation before writing this migration -- not guessed.
--
-- order_index is globally UNIQUE across python_challenges (confirmed via
-- the table's own constraint), so new rows are appended after whatever the
-- current max is, not hardcoded.

INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'Gini Impurity',
  'gini-impurity',
  E'Write a function called gini that takes a list of labels (strings) and returns their Gini impurity -- exactly the formula from the Decision Trees lesson: 1 minus the sum of each class''s proportion squared.\n\nAn empty list should return 0. Do not assume there are only ever two possible labels -- a real dataset can have any number of classes.',
  'medium',
  'gini',
  E'# gini(labels) -> the Gini impurity of a list of labels.
# Formula: 1 - sum(p_i ** 2) for each class''s proportion p_i.
# An empty list returns 0. Labels can belong to ANY number of classes,
# not just two.

def gini(labels):
    pass',
  E'def gini(labels):
    total = len(labels)
    if total == 0:
        return 0
    counts = {}
    for l in labels:
        counts[l] = counts.get(l, 0) + 1
    impurity = 1
    for count in counts.values():
        p = count / total
        impurity -= p ** 2
    return impurity',
  15,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[["spam", "spam", "spam"]]', '0', false),
    (2, '[["spam", "not spam"]]', '0.5', false),
    (3, '[["a", "a", "a", "b"]]', '0.375', false),
    (4, '[[]]', '0', true),
    (5, '[["x", "y", "z"]]', '0.6666666666666665', true),
    (6, '[["cat", "dog", "bird", "fish"]]', '0.75', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'gini-impurity';

INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'Ensemble Majority Vote',
  'ensemble-majority-vote',
  E'Write a function called majority_vote that takes a list of predictions (strings) -- one per model in an ensemble -- and returns whichever prediction appears most often.\n\nEvery test case here has a single clear majority, so you do not need to handle ties.',
  'easy',
  'majority_vote',
  E'# majority_vote(votes) -> the prediction that appears most often in votes.
# Every test case has a single clear majority -- no tie-handling needed.

def majority_vote(votes):
    pass',
  E'def majority_vote(votes):
    counts = {}
    for v in votes:
        counts[v] = counts.get(v, 0) + 1
    best = votes[0]
    best_count = 0
    for label, count in counts.items():
        if count > best_count:
            best = label
            best_count = count
    return best',
  10,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[["spam", "spam", "not spam"]]', '"spam"', false),
    (2, '[["not spam", "not spam", "not spam", "spam"]]', '"not spam"', false),
    (3, '[["a", "b", "a", "c", "a"]]', '"a"', false),
    (4, '[["yes", "no", "yes", "yes", "no", "no", "yes"]]', '"yes"', true),
    (5, '[["x"]]', '"x"', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'ensemble-majority-vote';

INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'K-Fold Sizes',
  'k-fold-sizes',
  E'Write a function called fold_sizes that takes total_examples (an integer) and k (an integer, the number of folds) and returns a list of k integers -- how many examples go in each fold.\n\nSplit as evenly as possible. If the examples do not divide evenly, distribute the remainder ONE AT A TIME across the FIRST folds (e.g. 10 examples into 3 folds is [4, 3, 3], not [4, 4, 2] and not [3, 3, 4]).\n\nThe Validation Sets lesson''s own k-fold code sidestepped this exact case by picking numbers that divided evenly -- this challenge does not let you.',
  'medium',
  'fold_sizes',
  E'# fold_sizes(total_examples, k) -> a list of k integers, as evenly split
# as possible. Any remainder is distributed ONE AT A TIME across the FIRST
# folds -- e.g. fold_sizes(10, 3) should return [4, 3, 3].

def fold_sizes(total_examples, k):
    pass',
  E'def fold_sizes(total_examples, k):
    base = total_examples // k
    remainder = total_examples % k
    result = []
    for i in range(k):
        if i < remainder:
            result.append(base + 1)
        else:
            result.append(base)
    return result',
  15,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[10, 3]', '[4, 3, 3]', false),
    (2, '[12, 4]', '[3, 3, 3, 3]', false),
    (3, '[7, 4]', '[2, 2, 2, 1]', true),
    (4, '[5, 5]', '[1, 1, 1, 1, 1]', true),
    (5, '[1, 3]', '[1, 0, 0]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'k-fold-sizes';

INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'One Gradient Descent Step',
  'gradient-descent-step',
  E'Write a function called gradient_descent_step that takes weight, bias, x, y, and learning_rate, and returns a list [new_weight, new_bias] after ONE step of gradient descent on the squared-error cost.\n\nThis is exactly the update rule from the Training vs. Predicting lesson: make a guess, measure the error, nudge weight and bias in the direction that reduces it.',
  'medium',
  'gradient_descent_step',
  E'# gradient_descent_step(weight, bias, x, y, learning_rate) -> [new_weight, new_bias]
# after ONE step of gradient descent, exactly the update rule from
# "Training vs. Predicting":
#   guess = weight * x + bias
#   error = guess - y
#   new_weight = weight - learning_rate * 2 * error * x
#   new_bias   = bias   - learning_rate * 2 * error

def gradient_descent_step(weight, bias, x, y, learning_rate):
    pass',
  E'def gradient_descent_step(weight, bias, x, y, learning_rate):
    guess = weight * x + bias
    error = guess - y
    new_weight = weight - learning_rate * 2 * error * x
    new_bias = bias - learning_rate * 2 * error
    return [new_weight, new_bias]',
  15,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[2, 5, 3, 30, 0.01]', '[3.14, 5.38]', false),
    (2, '[0, 0, 1, 12, 0.01]', '[0.24, 0.24]', false),
    (3, '[1, 1, 2, 20, 0.1]', '[7.800000000000001, 4.4]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'gradient-descent-step';

NOTIFY pgrst, 'reload schema';
