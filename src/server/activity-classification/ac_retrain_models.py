import sys
import json
import os
import shutil
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import load_model
import xgboost as xgb
import lightgbm as ltb
from sklearn import metrics
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import seaborn as sn
import numpy as np
import csv

acPath = str(Path.cwd()) + '/src/server/activity-classification/'
deepLearningPath = str(Path.cwd()) + '/src/server/deep-learning/'

def determine_delimiter(file_path):
    with open(file_path, 'r') as file:
        first_line = file.readline()
        return ',' if first_line.count(',') > first_line.count(';') else ';'

def read_csv(file_path):
    delimiter = determine_delimiter(file_path)
    return pd.read_csv(file_path, delimiter=delimiter)

def save_stats(y_true, y_pred, filepath):
    report = classification_report(y_true, y_pred, output_dict=True)
    stats = pd.DataFrame(report).transpose()
    stats.to_csv(filepath, header=True)

def save_conf_matrix(y_true, y_pred, filepath_csv, filepath_png):
    cm = confusion_matrix(y_true, y_pred)
    pd.DataFrame(cm).to_csv(filepath_csv)
    df_cfm = pd.DataFrame(cm, index=['1', '2', '3'], columns=['1', '2', '3'])
    cfm_plot = sn.heatmap(df_cfm, annot=True, fmt='.1f')
    cfm_plot.figure.savefig(filepath_png)

def split_datasets(modelId, dataset, trainingRatio):
    datasetFilePath = os.path.join(acPath, 'datasets/', dataset)
    fullDataset = pd.read_csv(datasetFilePath, header=0, usecols=[*range(1, 23)], sep=";")
    fullDataset.dropna(axis=0, inplace=True)

    y_df = fullDataset['output'].to_frame()
    X_df = fullDataset[fullDataset.columns.difference(['output'])]

    X_train, X_test, y_train_orig, y_test_orig = train_test_split(X_df, y_df, train_size=trainingRatio, random_state=1)

    train_dataset = pd.concat([X_train, y_train_orig], axis=1)[fullDataset.columns]
    test_dataset = pd.concat([X_test, y_test_orig], axis=1)[fullDataset.columns]

    trainingPath = os.path.join(deepLearningPath, 'trainings/', modelId, 'datasets')
    if os.path.exists(trainingPath):
        shutil.rmtree(trainingPath)
    os.makedirs(trainingPath)

    trainDatasetPath = os.path.join(trainingPath, 'Train_samples.csv')
    testDatasetPath = os.path.join(trainingPath, 'Test_samples.csv')
    train_dataset.to_csv(trainDatasetPath, index=False, sep=";")
    test_dataset.to_csv(testDatasetPath, index=False, sep=";")

    print(f"Created the training dataset: {trainDatasetPath}")
    print(f"Created the testing dataset: {testDatasetPath}")

    return X_train, X_test, y_train_orig, y_test_orig

def preprocess_datasets(X_train, X_test, y_train_orig, y_test_orig):
    output_train = []
    output_test = []
    prep_outputs = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]

    y_train_values = y_train_orig["output"].values if isinstance(y_train_orig, pd.DataFrame) else y_train_orig.values
    y_test_values = y_test_orig["output"].values if isinstance(y_test_orig, pd.DataFrame) else y_test_orig.values

    for value in y_train_values:
        output_train.append(prep_outputs[int(value) - 1])

    for value in y_test_values:
        output_test.append(prep_outputs[int(value) - 1])

    scaler = StandardScaler()
    scaler.fit(X_train)

    X_train = scaler.transform(X_train)
    y_train = np.array(output_train)

    X_test = scaler.transform(X_test)
    y_test = np.array(output_test)

    return X_train, y_train, X_test, y_test

def retrain_neural_network(modelFilePath, X_train, y_train_orig, X_test, y_test_orig, resultPath):
    print(resultPath, "result oooo", modelFilePath)
    keras_model = load_model(modelFilePath)
    X_train, y_train, X_test, y_test = preprocess_datasets(X_train, X_test, y_train_orig, y_test_orig)

    _, accuracy = keras_model.evaluate(X_train, y_train)
    print(f'Accuracy: {accuracy:.2f}')

    y_pred_proba = keras_model.predict(X_test)
    y_pred = y_pred_proba.argmax(axis=1) + 1

    df_pred = pd.DataFrame({'prediction': y_pred, 'true_label': y_test.argmax(axis=1) + 1})
    df_pred.to_csv(f'{resultPath}/predictions.csv', index=False, header=False)

    df_proba = pd.DataFrame(y_pred_proba, columns=['Web', 'Interactive', 'Video'])
    df_proba.to_csv(f'{resultPath}/predicted_probabilities.csv', index=False)

    y_test_labels = y_test.argmax(axis=1) + 1
    cm = confusion_matrix(y_test_labels, y_pred)
    save_stats(y_true=y_test_labels, y_pred=y_pred, filepath=f'{resultPath}/stats.csv')
    save_conf_matrix(y_true=y_test_labels, y_pred=y_pred, filepath_csv=f'{resultPath}/confusion_matrix.csv', filepath_png=f'{resultPath}/confusion_matrix.jpg')

    print('Saving model...')
    keras_model.save(f'{resultPath}/model.h5')

def retrain_xgboost(modelFilePath, X_train, y_train_orig, X_test, y_test_orig, resultPath):
    xgbc_model = xgb.XGBClassifier()
    xgbc_model.load_model(modelFilePath)
    X_train, y_train, X_test, y_test = preprocess_datasets(X_train, X_test, y_train_orig, y_test_orig)

    scores = cross_val_score(xgbc_model, X_train, y_train, cv=5)
    print(f"Mean cross-validation score: {scores.mean():.2f}")

    kfold = KFold(n_splits=10, shuffle=True)
    kf_cv_scores = cross_val_score(xgbc_model, X_train, y_train, cv=kfold)
    print(f"K-fold CV average score: {kf_cv_scores.mean():.2f}")

    y_pred = xgbc_model.predict(X_test)
    y_pred_proba = xgbc_model.predict_proba(X_test)
    y_pred_labels = y_pred_proba.argmax(axis=1) + 1

    df_pred = pd.DataFrame({'prediction': y_pred_labels, 'true_label': y_test.argmax(axis=1) + 1})
    df_pred.to_csv(f'{resultPath}/predictions.csv', index=False, header=False)

    df_proba = pd.DataFrame(y_pred_proba, columns=['Web', 'Interactive', 'Video'])
    df_proba.to_csv(f'{resultPath}/predicted_probabilities.csv', index=False)

    y_test_labels = y_test.argmax(axis=1) + 1
    cm = confusion_matrix(y_test_labels, y_pred_labels)
    save_stats(y_true=y_test_labels, y_pred=y_pred_labels, filepath=f'{resultPath}/stats.csv')
    save_conf_matrix(y_true=y_test_labels, y_pred=y_pred_labels, filepath_csv=f'{resultPath}/confusion_matrix.csv', filepath_png=f'{resultPath}/confusion_matrix.jpg')

    print('Saving model...')
    xgbc_model.save_model(f'{resultPath}/model.bin')

def retrain_lightgbm(modelFilePath, X_train, y_train_orig, X_test, y_test_orig, resultPath):
    lgbm_model = ltb.LGBMClassifier()
    lgbm_model.fit(X_train, y_train_orig)

    y_pred = lgbm_model.predict(X_test)
    y_pred_proba = lgbm_model.predict_proba(X_test)
    y_pred_labels = y_pred

    r_2_score = metrics.r2_score(y_test_orig, y_pred_labels)
    mean_squared_log_error_score = metrics.mean_squared_log_error(y_test_orig, y_pred_labels)
    print(f"r_2 score: {r_2_score:.2f}")
    print(f"mean_squared_log_error score: {mean_squared_log_error_score:.2f}")

    cm = confusion_matrix(y_test_orig.values.flatten(), y_pred_labels)
    print("Confusion matrix: \n" + str(cm))
    print(classification_report(y_test_orig, y_pred_labels))
    print(f'\nAccuracy: {accuracy_score(y_test_orig, y_pred_labels):.2f}\n')

    df_pred = pd.DataFrame({'prediction': y_pred_labels, 'true_label': y_test_orig.values.flatten()})
    df_pred.to_csv(f'{resultPath}/predictions.csv', index=False, header=False)

    df_proba = pd.DataFrame(y_pred_proba, columns=['Web', 'Interactive', 'Video'])
    df_proba.to_csv(f'{resultPath}/predicted_probabilities.csv', index=False)

    y_test_labels = y_test_orig.values.flatten()
    cm = confusion_matrix(y_test_labels, y_pred_labels)
    save_stats(y_true=y_test_labels, y_pred=y_pred_labels, filepath=f'{resultPath}/stats.csv')
    save_conf_matrix(y_true=y_test_labels, y_pred=y_pred_labels, filepath_csv=f'{resultPath}/confusion_matrix.csv', filepath_png=f'{resultPath}/confusion_matrix.jpg')

    lgbm_model.booster_.save_model(f'{resultPath}/model.bin')
    return lgbm_model

# def detect_delimiter(file_path):
#     with open(file_path, 'r') as file:
#         sample = file.read(1024)  # Read a sample of the file
#         sniffer = csv.Sniffer()
#         delimiter = sniffer.sniff(sample).delimiter
#     return delimiter

def retrain_model(modelType, modelId, trainDataPath, testDataPath, resultPath):
    basePath = resultPath.split('/trainings/')[0]
    trainingFolder = resultPath.split('/trainings/')[1].split('/')[0]
    targetDir = os.path.join(basePath, 'trainings', trainingFolder, 'datasets')

    print(f"Target directory: {targetDir}")

    def copy_csv_file(testDataPath, targetDir):
        try:
            os.makedirs(targetDir, exist_ok=True)
            targetFilePath = os.path.join(targetDir, os.path.basename(testDataPath))

            delimiter = detect_delimiter(testDataPath)
            if delimiter:
                print(f"Detected delimiter: '{delimiter}'")
                with open(testDataPath, 'r', newline='') as src_file:
                    reader = csv.reader(src_file, delimiter=delimiter)
                    with open(targetFilePath, 'w', newline='') as dest_file:
                        writer = csv.writer(dest_file, delimiter=delimiter)
                        for row in reader:
                            writer.writerow(row)
            else:
                print("Copying file without delimiter detection.")
                shutil.copy(testDataPath, targetFilePath)

            print(f"File copied from {testDataPath} to {targetDir}")
        except Exception as e:
            print(f"An error occurred while copying the file: {e}")
            return


    def detect_delimiter(file_path):
        try:
            with open(file_path, 'r') as file:
                sample = file.read(1024)
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
                print(delimiter)
            return delimiter
        except Exception as e:
            print(f"Could not determine delimiter: {e}")
            return None


    copy_csv_file(testDataPath, targetDir)
    try:
        train_df = read_csv(trainDataPath)
        test_df = read_csv(testDataPath)
    except Exception as e:
        print(f"An error occurred while reading CSV files: {e}")
        return

    X_train = train_df.drop(columns=['output'])
    y_train = train_df['output']
    X_test = test_df.drop(columns=['output'])
    y_test = test_df['output']

    modelFilePath = os.path.join(deepLearningPath, 'models', 'ac-' + modelType.lower().replace(' ', ''))
    print(f"Model path: {modelFilePath}")

    try:
        if modelType == "Neural Network":
            retrain_neural_network(modelFilePath, X_train, y_train, X_test, y_test, resultPath)
            modelFilePath = 'model.h5'
        elif modelType == "XGBoost":
            retrain_xgboost(modelFilePath, X_train, y_train, X_test, y_test, resultPath)
            modelFilePath = 'model.bin'
        elif modelType == "LightGBM":
            retrain_lightgbm(modelFilePath, X_train, y_train, X_test, y_test, resultPath)
            modelFilePath = 'model.bin'
        else:
            print("ERROR: Model type is not valid")
            return

        finalModelPath = os.path.join(resultPath, modelFilePath)
        print(f"Model saved to {finalModelPath}")
        shutil.copy(finalModelPath, os.path.join(deepLearningPath, 'models', modelId))
        print(f"Model copied to {os.path.join(deepLearningPath, 'models', modelId)}")

    except Exception as e:
        print(f"An error occurred during model retraining or copying: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print('Invalid inputs')
        print('python ac_retrain_models.py modelId trainDataPath testDataPath resultPath')
    else:
        modelId = sys.argv[1]
        trainDataPath = sys.argv[2]
        testDataPath = sys.argv[3]
        resultPath = sys.argv[4]

        retrainConfigFilePath = os.path.join(deepLearningPath, 'trainings', modelId, 'retrain-config.json')

        if not os.path.exists(retrainConfigFilePath):
            print(f"ERROR: Retrain config file does not exist: {retrainConfigFilePath}")
        else:
            with open(retrainConfigFilePath) as f:
                retrainConfig = json.load(f)
                modelType = retrainConfig['modelType']
                print(f"Model type: {modelType}, Model ID: {modelId}, Train Data Path: {trainDataPath}, Test Data Path: {testDataPath}, Result Path: {resultPath}")
                retrain_model(modelType, modelId, trainDataPath, testDataPath, resultPath)
