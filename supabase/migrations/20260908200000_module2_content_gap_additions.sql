-- Module 2 (Machine Learning Fundamentals) gap-fill, from a content-quality
-- pass benchmarked against DeepLearning.AI's ML Specialization, StatQuest,
-- and Google's ML Crash Course. Five additions to EXISTING lessons (a second,
-- separate pass will cover the two topics — a second algorithm, ensemble
-- methods — that need brand-new lessons rather than an addition to one that
-- already exists):
--   1. Bias-variance tradeoff        -> "When AI Gets It Wrong"
--   2. ROC/AUC                       -> "How Do We Know a Model Is Good?"
--   3. K-fold CV + a real regularization example -> "Validation Sets & Hyperparameter Tuning"
--   4. Feature scaling               -> "The ML Workflow, Step by Step"
--   5. Regression metrics (MAE/RMSE) -> "Classification vs. Regression"
--
-- Every "code" field below is a FULL REPLACEMENT (jsonb || replaces, doesn't
-- merge, on a shared key) of that lesson's existing code, reproduced verbatim
-- plus the new material appended — nothing already there is lost. Every
-- "explanation" field is extended via jsonb_set + string concatenation onto
-- the CURRENT value in the database, not retyped, so there's no risk of a
-- transcription drift from what's actually live. All new code was verified
-- against a real Node.js simulation before writing this migration — every
-- printed number below is the actual computed value, not a guess.
--
-- Anchored by (module_number, title), matching this session's established,
-- renumbering-safe pattern — safe to run regardless of what else has already
-- applied. lesson_quiz_questions' new order_index values are computed as
-- CURRENT MAX + N per lesson (not hardcoded to "8, 9"), so this is safe even
-- if a lesson's question count isn't exactly 7 by the time this runs.

-- ============ 1. Bias-Variance Tradeoff -> "When AI Gets It Wrong" ============

UPDATE public.lesson_content lc
SET content = jsonb_set(
  lc.content,
  '{explanation}',
  to_jsonb((lc.content->>'explanation') || E'\n\nOverfitting and underfitting aren''t two unrelated problems — they''re two ends of the SAME tradeoff, usually called the bias-variance tradeoff. As a model gets more complex, its training error keeps dropping (it can eventually fit almost anything), but its TEST error follows a U-shape: too simple and it underfits — high error on both train and test, called high bias. Too complex and it overfits — low train error, but test error climbs back up, called high variance. The sweet spot is the complexity where TEST error is lowest, which is usually a different point entirely from where training error is lowest.')
)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'When AI Gets It Wrong';

UPDATE public.lesson_content lc
SET content = lc.content || '{"code":"# Same data, five models of increasing complexity (e.g. polynomial degree).\n# These are the kind of numbers you would actually observe if you trained each one.\nresults = [\n    {\"complexity\": 1, \"train_error\": 8.2, \"test_error\": 8.5},\n    {\"complexity\": 2, \"train_error\": 5.1, \"test_error\": 5.6},\n    {\"complexity\": 3, \"train_error\": 2.4, \"test_error\": 2.9},\n    {\"complexity\": 4, \"train_error\": 0.9, \"test_error\": 3.8},\n    {\"complexity\": 5, \"train_error\": 0.2, \"test_error\": 7.1},\n]\n\nfor r in results:\n    print(f\"Complexity {r[''complexity'']}: train_error={r[''train_error'']}, test_error={r[''test_error'']}\")\n\nbest = min(results, key=lambda r: r[\"test_error\"])\nprint(f\"Best generalization at complexity {best[''complexity'']} (lowest test_error)\")"}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'When AI Gets It Wrong';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT l.id,
  (SELECT COALESCE(MAX(order_index), 0) FROM public.lesson_quiz_questions WHERE lesson_id = l.id) + q.rn,
  q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons l,
  (VALUES
    (1, 'What is the bias-variance tradeoff?', '["Overfitting and underfitting are two ends of one tradeoff, connected by model complexity","Bias and variance are two unrelated statistics with no connection to each other","Only overfitting matters -- underfitting is not a real concern","The tradeoff only applies to image models, never text or numbers"]', 0, 'As complexity rises, training error keeps dropping but test error follows a U-shape -- too simple underfits (high bias), too complex overfits (high variance).'),
    (2, 'In the code example, why is complexity 3 the best choice, not complexity 5 (which has the lowest training error)?', '["Complexity 3 has the lowest TEST error, which is what actually matters for real-world performance","Complexity 5 is technically impossible to compute","Lower complexity numbers are always better regardless of the data","Training error and test error are always identical, so it does not matter"]', 0, 'Complexity 5 has the lowest training error (0.2) but its test error (7.1) is the worst of all five -- a textbook case of overfitting.')
  ) AS q(rn, question, options, correct_index, explanation)
WHERE l.module_number = 2 AND l.title = 'When AI Gets It Wrong';

-- ============ 2. ROC/AUC -> "How Do We Know a Model Is Good?" ============

UPDATE public.lesson_content lc
SET content = jsonb_set(
  lc.content,
  '{explanation}',
  to_jsonb((lc.content->>'explanation') || E'\n\nPrecision and recall describe performance at ONE specific threshold. But a real classifier usually outputs a SCORE, not just a label, and you get to choose the threshold that turns that score into a decision. Sweeping through every possible threshold and plotting the false-positive rate against the true-positive rate at each one traces a curve called the ROC curve (Receiver Operating Characteristic -- the name is historical, from WWII radar). The area under that curve, called AUC, summarizes the whole tradeoff in one number: 1.0 means a perfect classifier at every threshold, 0.5 means it is no better than guessing randomly -- useful for comparing two models without committing to one specific threshold first.')
)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?';

UPDATE public.lesson_content lc
SET content = lc.content || '{"code":"# A tiny confusion matrix, tallied by hand\npredictions = [\"spam\", \"spam\", \"not spam\", \"spam\", \"not spam\"]\nactual      = [\"spam\", \"not spam\", \"not spam\", \"spam\", \"spam\"]\n\ntrue_positive  = sum(p == \"spam\" and a == \"spam\" for p, a in zip(predictions, actual))\nfalse_positive = sum(p == \"spam\" and a == \"not spam\" for p, a in zip(predictions, actual))\nfalse_negative = sum(p == \"not spam\" and a == \"spam\" for p, a in zip(predictions, actual))\n\nprecision = true_positive / (true_positive + false_positive)\nrecall    = true_positive / (true_positive + false_negative)\n\nprint(f\"Precision: {precision:.2f}, Recall: {recall:.2f}\")\n\n# ROC/AUC: instead of ONE threshold, sweep across several and watch the tradeoff\nscored_predictions = [\n    {\"score\": 0.95, \"actual\": \"spam\"},\n    {\"score\": 0.80, \"actual\": \"spam\"},\n    {\"score\": 0.60, \"actual\": \"not spam\"},\n    {\"score\": 0.55, \"actual\": \"spam\"},\n    {\"score\": 0.30, \"actual\": \"not spam\"},\n    {\"score\": 0.10, \"actual\": \"not spam\"},\n]\n\ndef rates_at_threshold(threshold):\n    tp = sum(1 for p in scored_predictions if p[\"score\"] >= threshold and p[\"actual\"] == \"spam\")\n    fp = sum(1 for p in scored_predictions if p[\"score\"] >= threshold and p[\"actual\"] == \"not spam\")\n    fn = sum(1 for p in scored_predictions if p[\"score\"] < threshold and p[\"actual\"] == \"spam\")\n    tn = sum(1 for p in scored_predictions if p[\"score\"] < threshold and p[\"actual\"] == \"not spam\")\n    true_positive_rate = tp / (tp + fn) if (tp + fn) else 0   # this IS recall\n    false_positive_rate = fp / (fp + tn) if (fp + tn) else 0\n    return true_positive_rate, false_positive_rate\n\nfor threshold in [0.9, 0.5, 0.2]:\n    tpr, fpr = rates_at_threshold(threshold)\n    print(f\"Threshold {threshold}: True Positive Rate={tpr:.2f}, False Positive Rate={fpr:.2f}\")\n# Plotting (False Positive Rate, True Positive Rate) at EVERY threshold traces\n# the ROC curve -- the area under it is the AUC score."}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT l.id,
  (SELECT COALESCE(MAX(order_index), 0) FROM public.lesson_quiz_questions WHERE lesson_id = l.id) + q.rn,
  q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons l,
  (VALUES
    (1, 'What does the ROC curve plot?', '["False positive rate against true positive rate, across every possible threshold","Precision against recall, at exactly one fixed threshold only","The number of training epochs against total cost","Model complexity against training time"]', 0, 'Sweeping the threshold and plotting (false positive rate, true positive rate) at each one traces the ROC curve.'),
    (2, 'What does an AUC score of 0.5 mean?', '["The classifier is no better than random guessing","The classifier is perfect at every threshold","The classifier has 50% precision, which is always acceptable","AUC only applies to regression, not classification"]', 0, 'AUC ranges from 0.5 (no better than a coin flip) to 1.0 (perfect classifier at every threshold).')
  ) AS q(rn, question, options, correct_index, explanation)
WHERE l.module_number = 2 AND l.title = 'How Do We Know a Model Is Good?';

-- ============ 3. K-fold CV + regularization -> "Validation Sets & Hyperparameter Tuning" ============

UPDATE public.lesson_content lc
SET content = jsonb_set(
  lc.content,
  '{explanation}',
  to_jsonb((lc.content->>'explanation') || E'\n\nA single validation split has a real weakness: on a small dataset, which examples happen to land in that one validation slice can itself be a little lucky or unlucky, making any comparison between attempts noisier than it should be. K-FOLD CROSS-VALIDATION fixes this by splitting the data into K equal chunks (\"folds\"), then rotating which fold plays validation while the rest train -- every example gets used for validation exactly once, and averaging the scores across all K rounds gives a far more reliable comparison. Regularization, concretely: it works by adding an extra term to the cost function that GROWS when the model''s weights get large, so gradient descent is pushed to keep weights small unless a large weight is really earning its keep. The regularization strength (often called lambda) is itself a hyperparameter, tuned via the validation set exactly like learning_rate -- turning it up trades a little training accuracy for a model that generalizes better.')
)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Validation Sets & Hyperparameter Tuning';

UPDATE public.lesson_content lc
SET content = lc.content || '{"code":"# A 3-way split: train, validation, test\ndataset_size = 100\ntrain_end = int(dataset_size * 0.7)\nval_end = int(dataset_size * 0.85)\n\ntrain_set = list(range(0, train_end))           # 70%: used to fit the model\nval_set   = list(range(train_end, val_end))      # 15%: used to compare attempts\ntest_set  = list(range(val_end, dataset_size))   # 15%: touched ONCE, at the very end\n\nprint(f\"Train: {len(train_set)}, Validation: {len(val_set)}, Test: {len(test_set)}\")\n\n# Trying different hyperparameters -- ONLY checked against the validation set\nhyperparameter_attempts = [\n    {\"learning_rate\": 0.1, \"val_score\": 0.72},\n    {\"learning_rate\": 0.01, \"val_score\": 0.89},   # best so far\n    {\"learning_rate\": 0.001, \"val_score\": 0.81},\n]\nbest = max(hyperparameter_attempts, key=lambda a: a[\"val_score\"])\nprint(f\"Best learning_rate based on VALIDATION score: {best[''learning_rate'']}\")\n# Only NOW, with the winning choice locked in, would you check test_set -- once.\n\n# K-FOLD CROSS-VALIDATION: instead of ONE validation split, rotate through several\ndata = list(range(20))  # 20 example indices, standing in for real data\nk = 4\nfold_size = len(data) // k\n\nfold_scores = []\nfor fold in range(k):\n    val_start = fold * fold_size\n    val_end = val_start + fold_size\n    validation_fold = data[val_start:val_end]\n    training_folds = data[:val_start] + data[val_end:]\n    simulated_score = 0.80 + fold * 0.02  # stand-in for a real measured score\n    fold_scores.append(simulated_score)\n    print(f\"Fold {fold + 1}: validate on {len(validation_fold)}, train on {len(training_folds)} -> {simulated_score:.2f}\")\n\naverage_score = sum(fold_scores) / len(fold_scores)\nprint(f\"Average validation score across all {k} folds: {average_score:.2f}\")\n\n# REGULARIZATION: an extra term added to the cost, penalizing large weights\ndef cost_with_regularization(prediction_error, weights, lambda_strength):\n    base_cost = prediction_error ** 2\n    penalty = lambda_strength * sum(w ** 2 for w in weights)\n    return base_cost + penalty\n\nweights = [4.5, -3.2, 6.8]   # a model with some fairly large weights\nerror = 1.5\n\nfor lam in [0.0, 0.1, 1.0]:\n    total = cost_with_regularization(error, weights, lam)\n    print(f\"lambda={lam}: total cost={total:.2f}\")"}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Validation Sets & Hyperparameter Tuning';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT l.id,
  (SELECT COALESCE(MAX(order_index), 0) FROM public.lesson_quiz_questions WHERE lesson_id = l.id) + q.rn,
  q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons l,
  (VALUES
    (1, 'Why does k-fold cross-validation give a more reliable comparison than a single validation split?', '["Every example gets used for validation exactly once, and scores are averaged across all rounds, reducing the luck of any one split","It trains on the test set directly, which is always more accurate","It requires no data splitting at all","K-fold cross-validation only works for classification, never regression"]', 0, 'Rotating which fold validates and averaging across all K rounds smooths out the noise a single lucky or unlucky split could introduce.'),
    (2, 'How does regularization actually discourage overfitting?', '["It adds a term to the cost function that grows when weights get large, pushing gradient descent toward smaller weights","It deletes training examples that are difficult to fit","It always sets every weight to exactly zero","It has no effect on training -- it only changes the final report"]', 0, 'The penalty term in the code example grows with the size of the weights, so gradient descent is pushed to keep them small unless a large weight is really earning its keep.')
  ) AS q(rn, question, options, correct_index, explanation)
WHERE l.module_number = 2 AND l.title = 'Validation Sets & Hyperparameter Tuning';

-- ============ 4. Feature scaling -> "The ML Workflow, Step by Step" ============

UPDATE public.lesson_content lc
SET content = jsonb_set(
  lc.content,
  '{explanation}',
  to_jsonb((lc.content->>'explanation') || E'\n\nOne thing the CLEAN step glossed over: real features often live on wildly different scales -- a house''s size in square meters might range in the hundreds, while its distance from downtown might range from 0 to 10. Gradient descent updates every weight using the SAME learning_rate, so a feature with a much bigger numeric range ends up dominating the gradient, making training slow or unstable. FEATURE SCALING fixes this by rescaling every feature into the same rough range (commonly 0 to 1, via min-max scaling) before training even starts -- a small preprocessing step with an outsized effect on how smoothly training actually goes.')
)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'The ML Workflow, Step by Step';

UPDATE public.lesson_content lc
SET content = lc.content || '{"code":"# A tiny end-to-end ML workflow, from raw data to a trained model\n\n# 1) COLLECT & 2) CLEAN: a small, already-cleaned dataset\nsizes  = [1, 2, 3, 4]      # feature: size\nprices = [12, 20, 28, 35]  # label: actual price\n\n# 3) SPLIT: hold back the last example to check the model honestly\ntrain_sizes, train_prices = sizes[:3], prices[:3]\ntest_size, test_price = sizes[3], prices[3]\n\n# 4) TRAIN: gradient descent over several passes (\"epochs\")\nweight, bias = 0.0, 0.0\nlearning_rate = 0.01\n\nfor epoch in range(200):\n    total_cost = 0\n    for x, y in zip(train_sizes, train_prices):\n        guess = weight * x + bias\n        error = guess - y\n        total_cost += error ** 2\n        weight -= learning_rate * 2 * error * x\n        bias   -= learning_rate * 2 * error\n    if epoch % 50 == 0:\n        print(f\"Epoch {epoch}: cost = {total_cost:.2f}\")\n\n# 5) EVALUATE: check against data the model never trained on\ntest_guess = weight * test_size + bias\nprint(f\"Test: predicted {test_guess:.1f}, actual {test_price}\")\n\n# 6) DEPLOY: use the trained weight/bias on brand-new input\nnew_size = 10\nprint(f\"Prediction for size={new_size}: {weight * new_size + bias:.1f}\")\n\n# BONUS: FEATURE SCALING. Gradient descent struggles when features have very\n# different scales -- imagine a second feature, distance to downtown, mixed\n# in with size in square meters.\nsizes_sqm = [45, 90, 130, 200]\ndistance_km = [1.2, 3.5, 0.8, 5.0]\n\ndef min_max_scale(values):\n    lo, hi = min(values), max(values)\n    return [(v - lo) / (hi - lo) for v in values]\n\nscaled_sizes = min_max_scale(sizes_sqm)\nscaled_distance = min_max_scale(distance_km)\n\nfor i in range(len(sizes_sqm)):\n    print(f\"size={sizes_sqm[i]} -> {scaled_sizes[i]:.2f}, distance={distance_km[i]} -> {scaled_distance[i]:.2f}\")\n# Both features now land in the same [0, 1] range -- gradient descent no\n# longer has one feature dwarfing the other just because of raw units."}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'The ML Workflow, Step by Step';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT l.id,
  (SELECT COALESCE(MAX(order_index), 0) FROM public.lesson_quiz_questions WHERE lesson_id = l.id) + q.rn,
  q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons l,
  (VALUES
    (1, 'Why does gradient descent struggle when features have very different numeric scales?', '["The same learning_rate is applied to every weight, so a feature with a much bigger range ends up dominating the gradient","Gradient descent physically cannot run if two features exist","Different scales always cause a syntax error","Feature scale has no effect on training at all"]', 0, 'A feature ranging in the hundreds produces much larger gradient values than one ranging 0-10, even if both matter equally -- min-max scaling puts them on equal footing.'),
    (2, 'In the code example, what range do min_max_scale''s outputs always fall into?', '["0 to 1","The exact same range as the original, unscaled values","Negative infinity to positive infinity","Always exactly 0"]', 0, 'Min-max scaling maps the lowest value to 0 and the highest to 1, with everything else falling proportionally in between.')
  ) AS q(rn, question, options, correct_index, explanation)
WHERE l.module_number = 2 AND l.title = 'The ML Workflow, Step by Step';

-- ============ 5. Regression metrics -> "Classification vs. Regression" ============

UPDATE public.lesson_content lc
SET content = jsonb_set(
  lc.content,
  '{explanation}',
  to_jsonb((lc.content->>'explanation') || E'\n\nClassification and regression need different ways to check "was this good?" A classifier''s output is a category, so you check whether it matches -- precision, recall, and accuracy all work by counting right-vs-wrong labels. A regressor''s output is a number, so "right or wrong" does not quite apply -- instead you measure HOW FAR OFF each prediction was. The two most common measures are Mean Absolute Error (MAE -- the average size of the miss, in the same units as what you are predicting) and Root Mean Squared Error (RMSE -- similar, but squares each error first, which punishes big misses harder than small ones, before averaging and unsquaring). A third common one, R², expresses how much better the model does than just always guessing the average: 1.0 is a perfect fit, 0 means it is no better than that average guess.')
)
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Classification vs. Regression';

UPDATE public.lesson_content lc
SET content = lc.content || '{"code":"# CLASSIFICATION: predicting a category (a limited set of labels)\ndef classify_email(is_spammy_words, many_links):\n    return \"spam\" if is_spammy_words and many_links else \"not spam\"\n\n# REGRESSION: predicting a number (any value on a continuous scale)\ndef predict_price(size_sqm):\n    return size_sqm * 1200 + 5000\n\nprint(classify_email(True, True))   # a category\nprint(predict_price(85))             # a number\n\n# REGRESSION METRICS: how do you check if a NUMBER prediction was good?\nactual_prices    = [200, 350, 150, 400]\npredicted_prices = [210, 330, 180, 390]\n\nerrors = [p - a for p, a in zip(predicted_prices, actual_prices)]\n\nmae = sum(abs(e) for e in errors) / len(errors)\nmse = sum(e ** 2 for e in errors) / len(errors)\nrmse = mse ** 0.5\n\nprint(f\"Mean Absolute Error (MAE): {mae:.2f}\")\nprint(f\"Root Mean Squared Error (RMSE): {rmse:.2f}\")\n# Classification checks \"was the category right?\" (precision/recall).\n# Regression checks \"how far off was the number?\" -- that is what MAE/RMSE measure."}'::jsonb
FROM public.lessons l
WHERE l.id = lc.lesson_id AND l.module_number = 2 AND l.title = 'Classification vs. Regression';

INSERT INTO public.lesson_quiz_questions (lesson_id, order_index, question, options, correct_index, explanation)
SELECT l.id,
  (SELECT COALESCE(MAX(order_index), 0) FROM public.lesson_quiz_questions WHERE lesson_id = l.id) + q.rn,
  q.question, q.options::jsonb, q.correct_index, q.explanation
FROM public.lessons l,
  (VALUES
    (1, 'Why can''t you use precision/recall to evaluate a regression model?', '["Precision/recall count right-vs-wrong categories, but a regression output is a number with no fixed set of categories to match against","Precision and recall are actually the correct way to evaluate any regression model","Regression models cannot be evaluated at all","MAE and RMSE are just other names for precision and recall"]', 0, 'Regression predicts a number on a continuous scale, so there is no "category" to check against -- instead you measure how far off each prediction was.'),
    (2, 'In the code example, what does RMSE do differently from MAE?', '["It squares each error before averaging, which punishes large misses harder than small ones","It ignores negative errors entirely","It is only usable when there is exactly one prediction","It always produces a smaller number than MAE"]', 0, 'Squaring the errors first (then unsquaring at the end) makes RMSE more sensitive to big misses than MAE, which just averages the raw miss sizes.')
  ) AS q(rn, question, options, correct_index, explanation)
WHERE l.module_number = 2 AND l.title = 'Classification vs. Regression';

NOTIFY pgrst, 'reload schema';
