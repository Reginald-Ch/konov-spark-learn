-- ML Capstone: Predict & Evaluate — a real end-to-end pipeline, split across
-- four Python Challenges, closing the biggest remaining gap in the
-- "certification-worthy for an AI/ML engineer" conversation: everything
-- taught in Module 2 so far (gradient descent, evaluation metrics, k-fold)
-- has only ever been practiced as isolated functions on 4-6-point toy
-- examples. Nothing before this chained those pieces into one real
-- pipeline on a realistic-sized dataset.
--
-- All four challenges share ONE dataset: 40 synthetic emails, each with a
-- single numeric feature (word_score, 0-10 -- a stand-in for a weighted
-- count of spam-trigger words) and a label (1 = spam, 0 = not spam). The
-- two classes genuinely overlap in the 4-6 range by design (a few
-- deliberately noisy/ambiguous points), so a correct solution does NOT
-- score a suspicious, unrealistic 100% -- the hidden end-to-end tests below
-- were computed by actually running this exact pipeline in Node.js first:
-- an 80/20 split (32 train / 8 test), 300 real epochs of batch gradient
-- descent (lr=0.002) from weight=0/bias=0, giving trained weight
-- 0.19149999950401225 and bias -0.4403915015048316, which then scores
-- accuracy 0.75 / precision 0.8 / recall 0.8 / f1 0.8 on the held-out test
-- set. That imperfect, honest result is the point -- it's what a real
-- trained model's evaluation actually looks like.
--
-- A student who completes all four has, for real: split data into
-- train/test, run gradient descent to convergence across many epochs (not
-- one animated step), generated predictions on unseen data, and computed
-- real precision/recall/F1 -- the actual shape of an ML workflow, not a
-- single isolated function.
--
-- order_index appended safely via COALESCE(MAX,0)+1, matching every prior
-- Python Challenges migration this session.

-- ============================================================
-- Part 1: train_test_split
-- ============================================================
INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'ML Capstone: Split the Data',
  'ml-capstone-train-test-split',
  E'This is Part 1 of the ML Capstone: Predict & Evaluate -- across four challenges, you''ll build a real spam classifier end to end: split real data, train a model with real gradient descent, generate predictions, and score them with real evaluation metrics.\n\nWrite train_test_split(x_values, y_values, train_fraction) that splits a labeled dataset into a training set and a test set. Take the FIRST train_fraction share of the data as training, and the rest as the test set -- no shuffling, the dataset is already arranged for a fair split. Return [train_x, train_y, test_x, test_y].\n\nUse int(len(x_values) * train_fraction) to compute how many examples go to training.',
  'easy',
  'train_test_split',
  E'# Part 1/4 of the ML Capstone. train_test_split(x_values, y_values, train_fraction)
# -> [train_x, train_y, test_x, test_y]. The first share of the data (by
# train_fraction) is training, the rest is test. No shuffling.
# cut = int(len(x_values) * train_fraction)

def train_test_split(x_values, y_values, train_fraction):
    pass',
  E'def train_test_split(x_values, y_values, train_fraction):
    cut = int(len(x_values) * train_fraction)
    train_x = x_values[:cut]
    train_y = y_values[:cut]
    test_x = x_values[cut:]
    test_y = y_values[cut:]
    return [train_x, train_y, test_x, test_y]',
  10,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[[1, 2, 3, 4, 5], [0, 1, 0, 1, 0], 0.8]', '[[1, 2, 3, 4], [0, 1, 0, 1], [5], [0]]', false),
    (2, '[[1, 2, 3, 4], [1, 0, 1, 0], 0.5]', '[[1, 2], [1, 0], [3, 4], [1, 0]]', false),
    (3, '[[10, 20, 30], [1, 1, 0], 1.0]', '[[10, 20, 30], [1, 1, 0], [], []]', true),
    (4, '[[7.8, 2.4, 7.6, 2.6, 6.4, 2.2, 5.6, 2.3, 6.9, 1.8, 5.8, 3.5, 5.6, 3.6, 7.6, 1.4, 7.3, 3.2, 7.6, 3.8, 6.8, 3.5, 8.3, 2.1, 7.2, 3.2, 6.9, 2, 7.9, 2.6, 7.2, 3.3, 6.2, 4.8, 8.1, 1.7, 6.7, 5.3, 7.2, 1.7], [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0], 0.8]',
     '[[7.8, 2.4, 7.6, 2.6, 6.4, 2.2, 5.6, 2.3, 6.9, 1.8, 5.8, 3.5, 5.6, 3.6, 7.6, 1.4, 7.3, 3.2, 7.6, 3.8, 6.8, 3.5, 8.3, 2.1, 7.2, 3.2, 6.9, 2, 7.9, 2.6, 7.2, 3.3], [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], [6.2, 4.8, 8.1, 1.7, 6.7, 5.3, 7.2, 1.7], [1, 1, 1, 0, 1, 0, 1, 0]]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'ml-capstone-train-test-split';

-- ============================================================
-- Part 2: train_classifier
-- ============================================================
INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'ML Capstone: Train the Classifier',
  'ml-capstone-train-classifier',
  E'Part 2 of the ML Capstone. You''ve split the data -- now actually train a model on it, for real, across many passes over the data.\n\nWrite train_classifier(train_x, train_y, epochs, learning_rate) that trains a simple linear classifier using the exact gradient descent update rule from "Training vs. Predicting": for every example, guess = weight * x + bias, error = guess - y, then nudge weight and bias to reduce that error. Do this for every example, once per epoch, for epochs total epochs, starting from weight = 0 and bias = 0.\n\nReturn [weight, bias] after all epochs are done. This is not a single animated step -- with enough epochs on real data, this genuinely trains.',
  'hard',
  'train_classifier',
  E'# Part 2/4 of the ML Capstone. train_classifier(train_x, train_y, epochs,
# learning_rate) -> [weight, bias] after real training.
# Start weight = 0, bias = 0. For each epoch, loop over every example:
#   guess = weight * x + bias
#   error = guess - y
#   weight -= learning_rate * 2 * error * x
#   bias   -= learning_rate * 2 * error

def train_classifier(train_x, train_y, epochs, learning_rate):
    pass',
  E'def train_classifier(train_x, train_y, epochs, learning_rate):
    weight = 0
    bias = 0
    for epoch in range(epochs):
        for i in range(len(train_x)):
            guess = weight * train_x[i] + bias
            error = guess - train_y[i]
            weight = weight - learning_rate * 2 * error * train_x[i]
            bias = bias - learning_rate * 2 * error
    return [weight, bias]',
  20,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[[5], [5], 1, 0.1]', '[5, 1]', false),
    (2, '[[1, 2, 3], [0, 0, 1], 5, 0.01]', '[0.17059302217167543, 0.0424328760274064]', false),
    (3, '[[1, 2, 3], [1, 1, 1], 0, 0.1]', '[0, 0]', true),
    (4, '[[7.8, 2.4, 7.6, 2.6, 6.4, 2.2, 5.6, 2.3, 6.9, 1.8, 5.8, 3.5, 5.6, 3.6, 7.6, 1.4, 7.3, 3.2, 7.6, 3.8, 6.8, 3.5, 8.3, 2.1, 7.2, 3.2, 6.9, 2, 7.9, 2.6, 7.2, 3.3], [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], 300, 0.002]',
     '[0.19149999950401225, -0.4403915015048316]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'ml-capstone-train-classifier';

-- ============================================================
-- Part 3: predict_labels
-- ============================================================
INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'ML Capstone: Predict',
  'ml-capstone-predict-labels',
  E'Part 3 of the ML Capstone. You have a trained model -- now use it to actually make predictions on data it has never seen (the test set from Part 1).\n\nWrite predict_labels(weight, bias, x_values, threshold) that scores every value in x_values as weight * x + bias, and returns 1 if that score is greater than or equal to threshold, otherwise 0. Return the list of predicted labels, in order.',
  'easy',
  'predict_labels',
  E'# Part 3/4 of the ML Capstone. predict_labels(weight, bias, x_values,
# threshold) -> a list of predicted 0/1 labels, one per value in x_values.
# score = weight * x + bias. Predict 1 if score >= threshold, else 0.

def predict_labels(weight, bias, x_values, threshold):
    pass',
  E'def predict_labels(weight, bias, x_values, threshold):
    predictions = []
    for x in x_values:
        score = weight * x + bias
        if score >= threshold:
            predictions.append(1)
        else:
            predictions.append(0)
    return predictions',
  10,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[2, 1, [0, 1, 2], 2]', '[0, 1, 1]', false),
    (2, '[0.5, -1, [0, 1, 2, 3], 0]', '[0, 0, 1, 1]', false),
    (3, '[1, 0, [-2, -1, 0, 1, 2], 0]', '[0, 0, 1, 1, 1]', true),
    (4, '[0.19149999950401225, -0.4403915015048316, [6.2, 4.8, 8.1, 1.7, 6.7, 5.3, 7.2, 1.7], 0.5]', '[1, 0, 1, 0, 1, 1, 1, 0]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'ml-capstone-predict-labels';

-- ============================================================
-- Part 4: evaluate_predictions
-- ============================================================
INSERT INTO public.python_challenges (order_index, title, slug, prompt, difficulty, function_name, starter_code, reference_solution, coin_reward, is_published)
VALUES (
  (SELECT COALESCE(MAX(order_index), 0) FROM public.python_challenges) + 1,
  'ML Capstone: Evaluate',
  'ml-capstone-evaluate-predictions',
  E'Part 4 of the ML Capstone -- the moment of truth. Real predictions on real held-out data, scored honestly.\n\nWrite evaluate_predictions(true_labels, predicted_labels) that compares predicted labels against the real labels and returns [accuracy, precision, recall, f1], in that exact order, treating label 1 as the positive class.\n\naccuracy = correct predictions / total\nprecision = true positives / (true positives + false positives)\nrecall = true positives / (true positives + false negatives)\nf1 = 2 * precision * recall / (precision + recall)\n\nIf a denominator would be zero, return 0 for that metric instead of dividing by zero. A perfect classifier is not guaranteed here -- score honestly, whatever the numbers turn out to be.',
  'medium',
  'evaluate_predictions',
  E'# Part 4/4 of the ML Capstone. evaluate_predictions(true_labels,
# predicted_labels) -> [accuracy, precision, recall, f1], label 1 = positive.
# Count tp/tn/fp/fn first. Guard every division: if a denominator is 0,
# that metric is 0, not an error.

def evaluate_predictions(true_labels, predicted_labels):
    pass',
  E'def evaluate_predictions(true_labels, predicted_labels):
    tp = 0
    tn = 0
    fp = 0
    fn = 0
    for i in range(len(true_labels)):
        t = true_labels[i]
        p = predicted_labels[i]
        if t == 1 and p == 1:
            tp = tp + 1
        elif t == 0 and p == 0:
            tn = tn + 1
        elif t == 0 and p == 1:
            fp = fp + 1
        elif t == 1 and p == 0:
            fn = fn + 1
    total = len(true_labels)
    if total == 0:
        accuracy = 0
    else:
        accuracy = (tp + tn) / total
    if (tp + fp) == 0:
        precision = 0
    else:
        precision = tp / (tp + fp)
    if (tp + fn) == 0:
        recall = 0
    else:
        recall = tp / (tp + fn)
    if (precision + recall) == 0:
        f1 = 0
    else:
        f1 = 2 * precision * recall / (precision + recall)
    return [accuracy, precision, recall, f1]',
  15,
  true
);

INSERT INTO public.python_challenge_tests (challenge_id, order_index, input_args, expected_output, is_hidden)
SELECT id, t.order_index, t.input_args::jsonb, t.expected_output::jsonb, t.is_hidden
FROM public.python_challenges, LATERAL (
  VALUES
    (1, '[[1, 1, 0, 0], [1, 0, 0, 1]]', '[0.5, 0.5, 0.5, 0.5]', false),
    (2, '[[1, 1, 1], [1, 1, 1]]', '[1, 1, 1, 1]', false),
    (3, '[[0, 0], [1, 1]]', '[0, 0, 0, 0]', true),
    (4, '[[1, 1], [0, 0]]', '[0, 0, 0, 0]', true),
    (5, '[[1, 1, 1, 0, 1, 0, 1, 0], [1, 0, 1, 0, 1, 1, 1, 0]]', '[0.75, 0.8, 0.8, 0.8000000000000002]', true)
) AS t(order_index, input_args, expected_output, is_hidden)
WHERE python_challenges.slug = 'ml-capstone-evaluate-predictions';

NOTIFY pgrst, 'reload schema';
