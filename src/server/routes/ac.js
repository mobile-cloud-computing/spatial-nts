/* eslint-disable no-unused-vars */
const express = require('express');
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const csv = require('csv-parser');
const router = express.Router();
const {
    AC_PATH, TRAINING_PATH,
} = require('../constants');
const {
    listFiles, readTextFile, isFileExist,
} = require('../utils/file-utils');
const {
    replaceDelimiterInCsv
} = require('../utils/utils');
const {
    getBuildingStatusAC,
    startBuildingModelAC,
    getRetrainStatusAC,
    startRetrainModelAC,
} = require('../activity-classification/ac-connector');

router.get('/datasets', async (req, res, next) => {
    try {
        const datasetsPath = path.join(AC_PATH, 'datasets')
        const files = await readdirAsync(datasetsPath);
        const allDatasets = files.filter(file => {
            return path.extname(file) === '.csv';
        });
        res.send({datasets: allDatasets});
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/build', (req, res) => {
    res.send({
        buildStatus: getBuildingStatusAC(),
    });
});

router.post('/build', async (req, res, next) => {
    const {
        buildACConfig,
    } = req.body;
    if (!buildACConfig) {
        res.status(401).send({
            error: 'Missing building configuration. Please read the docs',
        });
    } else {
        const buildingStatus = getBuildingStatusAC();

        if (buildingStatus.isRunning) {
            res.status(401).send({
                error: 'A building process is running. Only one process is allowed at the time. Please try again later',
            });
        } else {
            startBuildingModelAC(buildACConfig, (buildStatus) => {
                if (buildStatus.error) {
                    res.status(401).send({
                        error: buildStatus.error,
                    });
                } else {
                    const modelId = buildStatus.lastBuildId;
                    console.log(modelId, buildStatus);
                    const buildStatusFilePath = `${TRAINING_PATH}${modelId}/buildingStatus.json`;
                    fs.writeFile(buildStatusFilePath, JSON.stringify(buildStatus), (err) => {
                        if (err) {
                            console.log(`Error saving buildStatus of model ${modelId} to file: ${err}`);
                        } else {
                            console.log(`BuildStatus of model ${modelId} saved to file: ${buildStatusFilePath}`);
                        }
                    });
                    res.send(buildStatus);
                }
            });
        }
    }
});

router.get('/retrain', (req, res) => {
    res.send({
        retrainStatus: getRetrainStatusAC(),
    });
});

router.post('/retrain', async (req, res, next) => {
    const {
        retrainACConfig,
    } = req.body;
    const retrainACConfigg = {...retrainACConfig};
    if (!retrainACConfigg) {
        res.status(401).send({
            error: 'Missing retrain configuration. Please read the docs',
        });
    } else {
        const retrainStatus = getRetrainStatusAC();
        if (retrainStatus.isRunning) {
            res.status(401).send({
                error: 'A retrain process is running. Only one process is allowed at the time. Please try again later',
            });
        } else {
            await startRetrainModelAC(retrainACConfigg, (retrainStatus) => {
                if (retrainStatus.error) {
                    res.status(401).send({
                        error: retrainStatus.error,
                    });
                } else {
                    res.send(retrainStatus);
                }
            });
        }
    }
    router.post('/retrain/:modelId', (req, res) => {
        const {modelId} = req.params;
        const {datasetsConfig} = req.body;

        console.log(datasetsConfig);

        if (!datasetsConfig) {
            return res.status(400).send({
                error: 'Missing retrain configuration. Please read the docs',
            });
        }

        const retrainStatus = getRetrainStatusAC();
        if (retrainStatus.isRunning) {
            return res.status(409).send({
                error: 'A retrain process is running. Only one process is allowed at a time. Please try again later',
            });
        }

        startRetrainModelAC(retrainACConfig, (retrainStatus) => {
            if (retrainStatus.error) {
                return res.status(500).send({
                    error: retrainStatus.error,
                });
            }

            console.log(retrainStatus, "stattttt");
            return res.send(retrainStatus);
        });
    });

});

module.exports = router;
