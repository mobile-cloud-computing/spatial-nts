/* eslint-disable no-unused-vars */
const express = require('express');

const router = express.Router();

const {
  isFileExist,
  safeReadFile,
} = require('../utils/file-utils');
const {
  TRAINING_PATH,
  XAI_PATH,
  ATTACKS_PATH,
} = require('../constants');
const {
  getRetrainStatus,
  retrainModel,
} = require('../deep-learning/deep-learning-connector');

const fs = require('fs');
const path = require('path');

function extractAccuracy(modelId) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${TRAINING_PATH}${modelId}/results/stats.csv`, 'utf8', (err, stats) => {
      if (err) {
        reject(err);
      } else {
        const rows = stats.split('\n');
        let accuracy = null;

        for (let row of rows) {
          const columns = row.split(',');
          if (columns[0] === 'accuracy') {
            accuracy = columns[1];
            break;
          }
        }

        if (accuracy) {
          resolve(accuracy);
        } else {
          reject(new Error('Accuracy not found'));
        }
      }
    });
  });
}

/**
 * @swagger
 * /{modelId}/accuracy:
 *   get:
 *     summary: Get the accuracy of the specified model.
 *     tags:
 *       - Model Metrics
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the model.
 *     responses:
 *       200:
 *         description: Successfully retrieved accuracy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accuracy:
 *                   type: string
 *       400:
 *         description: Accuracy not found or error occurred.
 */
router.get('/:modelId/accuracy', async (req, res, next) => {
  const { modelId } = req.params;
  try {
    const accuracy = await extractAccuracy(modelId);
    res.send({ accuracy });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

/**
 * @swagger
 * /{modelId}/currentness:
 *   get:
 *     summary: Get the currentness of SHAP and LIME for the specified model.
 *     tags:
 *       - Model Metrics
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the model.
 *     responses:
 *       200:
 *         description: Successfully retrieved currentness.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentness:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error occurred.
 */
router.get('/:modelId/currentness', async (req, res, next) => {
  const { modelId } = req.params;
  const files = [
    `${TRAINING_PATH}${modelId.replace('.h5', '')}/results/time_stats.txt`, 
    `${XAI_PATH}${modelId.replace('.h5', '')}/time_stats_shap.txt`,
    `${XAI_PATH}${modelId.replace('.h5', '')}/time_stats_lime.txt`  
  ];

  try {
    const data = await Promise.all(files.map(file => safeReadFile(file)));
    const time_predict = data[0];
    const time_shap = data[1];
    const time_lime = data[2];

    const shap_currentness = time_predict ? time_shap / time_predict : 0;
    const lime_currentness = time_predict ? time_lime / time_predict : 0;

    res.send({ 
      currentness: [`SHAP: ${shap_currentness}`, `LIME: ${lime_currentness}`] 
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }  
});

router.get('/:typePoisoningAttack/:modelId/impact', (req, res, next) => {
  const { typePoisoningAttack, modelId } = req.params;
  
  const poisonedDatasetPath = `${ATTACKS_PATH}${modelId.replace('.h5', '')}/${typePoisoningAttack}_poisoned_dataset.csv`;
  const testingSamplesFilePath = `${TRAINING_PATH}${modelId.replace('.h5', '')}/datasets/Test_samples.csv`;

  isFileExist(poisonedDatasetPath, (ret) => {
    if (!ret) {
      res.status(401).send(`The poisoned dataset does not exist`);
    } else {
      const buildConfigPath = `${TRAINING_PATH}${modelId.replace('.h5', '')}/build-config.json`;
      const buildConfig = fs.readFileSync(buildConfigPath);
      const buildObj = JSON.parse(buildConfig);
      const retrainConfig = {
        modelId, 
        trainingDataset: poisonedDatasetPath,
        testingDataset: testingSamplesFilePath,
        training_parameters: buildObj.training_parameters,
      };
      
      const retrainStatus = getRetrainStatus();
      if (retrainStatus.isRunning) {
        res.status(401).send({
          error: 'A building process is running. Only one process is allowed at the time. Please try again later',
        });
      } else {
        const promise = new Promise((resolve, reject) => {
          retrainModel(retrainConfig, (results) => {
            if (results.error) {
              reject(results.error);
            } else {
              resolve(results);
            }
          });
        });

        promise.then((results) => {
          return extractAccuracy(results.retrainId);
        }).then((accuracy) => {
          res.send({ accuracy });
        }).catch((err) => {
          res.status(500).send('An error occurred');
        });
      }
    }
  }); 
});

module.exports = router;
