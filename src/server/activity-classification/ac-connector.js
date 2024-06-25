/* eslint-disable no-plusplus */
const {
    TRAINING_PATH, MODEL_PATH, LOG_PATH,
    PYTHON_CMD, AC_PATH, ATTACKS_PATH,
} = require('../constants');
const {
    isFileExist,
    isFileExistSync,
    listFilesAsync,
    createFolderSync,
    writeTextFile,
    listFilesByTypeAsync,
} = require('../utils/file-utils');
const {
    spawnCommand,
    getUniqueId,
} = require('../utils/utils');

const fs = require('fs').promises;
const path = require('path');

/**
 * The building status
 */
const buildingStatus = {
    isRunning: false, // indicates if the building process is on going
    lastBuildAt: null, // indicates the started time of the last build
    lastBuildId: null, // indicates the id of the last build
    config: null, // the configuration of the last build
};

/**
 * The retrain status
 */
const retrainStatus = {
    isRunning: false, // indicate if the retraining process is ongoing
    lastBuildAt: null, // indicate the time started time of the last retraining model
    config: null, // the configuration of the last retraining model
};

const getRetrainStatusAC = () => retrainStatus;

const copyFile = async (src, dest) => {
    const {createReadStream, createWriteStream} = require('fs');
    return new Promise((resolve, reject) => {
        const readStream = createReadStream(src);
        const writeStream = createWriteStream(dest);

        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);

        readStream.pipe(writeStream);
    });
};

const startRetrainModelAC = async (retrainACConfig, callback) => {

    const {modelType, modelId, datasetsConfig} = retrainACConfig;
    const {trainingDataset, testingDataset} = datasetsConfig;

    if (retrainStatus.isRunning) {
        console.warn('A retrain process is ongoing. Only one process can run at a time');
        return callback({
            error: 'A retrain process is ongoing',
        });
    }

    const mt = modelType.toLowerCase().split(' ').join('')

    const retrainId = "ac-at-" + mt + getUniqueId().substring(1, 5);
    const retrainPath = `${TRAINING_PATH}${retrainId}/`;
    createFolderSync(retrainPath);


    retrainStatus.isRunning = true;
    retrainStatus.config = retrainACConfig;
    retrainStatus.lastRetrainId = retrainId;
    // retrainStatus.lastRetrainAt = Date.now();
    retrainStatus.lastBuildAt = Date.now();

    const retrainACConfigPath = `${retrainPath}retrain-config.json`;
    const buildStatusFilePath = `${TRAINING_PATH}${retrainId.replace('.h5', '')}/buildingStatus.json`;

    // fs.writeFile(buildStatusFilePath, JSON.stringify(buildStatus), (err) => {
    //       if (err) {
    //         console.log(`Error saving buildStatus of model ${modelId} to file: ${err}`);
    //       } else {
    //         console.log(`BuildStatus of model ${modelId} saved to file: ${buildStatusFilePath}`);
    //       }
    //     });

    try {
        await fs.writeFile(retrainACConfigPath, JSON.stringify(retrainACConfig));
        await fs.writeFile(buildStatusFilePath, JSON.stringify(retrainStatus));

        // buildingStatus.lastBuildId = ret.buildId;
    } catch (error) {
        console.error('Failed to create retrainACConfig file', error);
        return callback({
            error: 'Failed to create retrainACConfig file', error
        });
    }

    const attacksPath = `${ATTACKS_PATH}${modelId.replace('.h5', '')}/`;
    const trainingPath = `${TRAINING_PATH}${modelId.replace('.h5', '')}/datasets/`;

    let trainingDatasetFile = null;
    let testingDatasetFile = null;

    if (isFileExistSync(path.join(attacksPath, trainingDataset))) {
        trainingDatasetFile = path.join(attacksPath, trainingDataset);
    } else if (isFileExistSync(path.join(trainingPath, trainingDataset))) {
        trainingDatasetFile = path.join(trainingPath, trainingDataset);
    } else {
        return callback({
            error: 'Invalid training dataset',
        });
    }

    if (isFileExistSync(path.join(trainingPath, testingDataset))) {
        testingDatasetFile = path.join(trainingPath, testingDataset);
    } else {
        return callback({
            error: 'Invalid testing dataset',
        });
    }

    const src = `${trainingDatasetFile}`;
    const datasetsPath = `${TRAINING_PATH}${retrainId}/datasets`;
    const dest = path.join(datasetsPath, 'Train_samples.csv');

    console.log(src, "the_source")

    createFolderSync(datasetsPath);

    try {
        await fs.copyFile(src, dest, fs.constants.COPYFILE_FICLONE);
        console.log('File copied successfully using copy-on-write!');
    } catch (err) {
        if (err.code === 'ENOTSUP') {
            console.warn('Copy-on-write not supported. Falling back to regular copy.');
            try {
                await copyFile(src, dest);
                console.log('File copied successfully!');
            } catch (fallbackErr) {
                console.error('Error occurred while copying the file:', fallbackErr);
                return callback({
                    error: 'Failed to copy the file using regular copy', fallbackErr
                });
            }
        } else if (err.code === 'EISDIR') {
            console.error('Source is a directory, expected a file:', err);
            return callback({
                error: 'Source is a directory, expected a file', err
            });
        } else {
            console.error('Error occurred while copying the file:', err);
            return callback({
                error: 'Failed to copy the file', err
            });
        }
    }

    const inputModelFilePath = `${MODEL_PATH}${modelId}`;

    if (!isFileExistSync(inputModelFilePath)) {
        return callback({
            error: `The given model file ${modelId} does not exist`,
        });
    }


    // createFolderSync(trainingPath);
    // const buildConfigPath = `${trainingPath}build-config.json`;
    // return writeTextFile(buildConfigPath, JSON.stringify(retrainACConfig), (error) => {
    //     if (error) {
    //         console.log('Failed to create buildConfig file');
    //         return callback({
    //             error: 'Failed to prepare the training location',
    //         });
    //     }
    //     return callback({
    //         buildConfig: buildConfigPath,
    //         retrainId,
    //     });
    // });

    const logFile = `${LOG_PATH}retraining_${retrainId}.log`;
    const resultsPath = `${TRAINING_PATH}${retrainId}/results`;
    createFolderSync(resultsPath);

    spawnCommand(PYTHON_CMD, [`${AC_PATH}/ac_retrain_models.py`, retrainId, trainingDatasetFile, testingDatasetFile, resultsPath], logFile, () => {
        retrainStatus.isRunning = false;
        console.log('Finished retraining the model xaxa', modelId);
    });

    return callback({
        retrainACConfig: retrainACConfigPath,
        retrainId,
        retrainStatus
    });
};

const getBuildingStatusAC = () => buildingStatus;

const startBuildingModelAC = (buildACConfig, callback) => {
    console.log('Start building the AC model');
    const {modelType} = buildACConfig;
    const mt = modelType.toLowerCase().split(' ').join('')
    const buildId = getUniqueId();
    const modelId = `ac-${mt}-${buildId}`;
    // const modelId = `ac-${buildId}`;
    const buildPath = `${TRAINING_PATH}${modelId}/`;
    createFolderSync(buildPath);
    console.log(buildPath);

    buildingStatus.isRunning = true;
    buildingStatus.config = buildACConfig;
    buildingStatus.lastBuildAt = Date.now();
    buildingStatus.lastBuildId = `ac-${mt}-${buildId}`;
    buildingStatus.buildPath = buildPath;

    const buildConfigPath = `${buildPath}build-config.json`;
    writeTextFile(buildConfigPath, JSON.stringify(buildACConfig), (error) => {
        if (error) {
            console.log('Failed to create buildConfig file');
            return callback({
                error: 'Failed to create buildConfig file',
            });
        }
    });

    const logFilePath = `${LOG_PATH}training_${modelId}.log`;
    const resultsPath = `${TRAINING_PATH}${modelId}/results`;
    createFolderSync(resultsPath);
    spawnCommand(PYTHON_CMD, [`${AC_PATH}/ac_build_models.py`, modelId, buildConfigPath, resultsPath], logFilePath, () => {
        buildingStatus.isRunning = false;
    });
    callback(buildingStatus);
};

module.exports = {
    getBuildingStatusAC,
    startBuildingModelAC,
    getRetrainStatusAC,
    startRetrainModelAC,
};
