const express = require('express');
const {
  getXAIStatus,
  runSHAP,
  runLIME,
} = require('../deep-learning/xai-connector');
const {
  listFiles,
  isFileExist,
} = require('../utils/file-utils');
const {
  XAI_PATH,
} = require('../constants');
const {
  AC_OUTPUT_LABELS, AD_OUTPUT_LABELS_SHORT,
} = require('../../client/src/constants');

const router = express.Router();

const isACModel = modelId => modelId && modelId.startsWith('ac-');
const getLabelsListXAI = modelId => isACModel(modelId) ? AC_OUTPUT_LABELS : AD_OUTPUT_LABELS_SHORT;

const getLabelsListXAI = (modelId) => {
  return isACModel(modelId) ? AC_OUTPUT_LABELS : AD_OUTPUT_LABELS_SHORT;
}

router.get('/', (_, res) => {
  res.send({
    xaiStatus: getXAIStatus(),
  });
});

router.post('/shap', async (req, res) => {
  const { shapConfig } = req.body;
  if (!shapConfig) {
    res.status(401).send({
      error: 'Missing SHAP configuration. Please read the docs',
    });
  } else {
    runSHAP(shapConfig, (xaiStatus) => {
      res.send(xaiStatus);
    });
  }
});

router.post('/lime', (req, res) => {
  const { limeConfig } = req.body;
  if (!limeConfig) {
    res.status(401).send({
      error: 'Missing LIME configuration. Please read the docs',
    });
  } else {
    runLIME(limeConfig, (xaiStatus) => {
      res.send(xaiStatus);
    });
  }
});

/**
 * Get a list of explanations of a specific model
 */
router.get('/explanations/:modelId', (req, res) => {
  const { modelId } = req.params;
  const xaiFilePath = `${XAI_PATH}${modelId.replace('.h5', '')}`;

  listFiles(xaiFilePath, '.json', (files) => {
    res.send({
      explanations: files,
    });
  });
});

/**
 * Get SHAP feature importance values of a specific model
 */
router.get('/shap/explanations/:modelId/:labelId', (req, res) => {
  const { modelId, labelId } = req.params;
  const labelsList = getLabelsListXAI(modelId);

  if (labelId < 0 || labelId >= labelsList.length) {
    res.status(400).send(`Invalid labelId ${labelId}. It should be between 0 and ${labelsList.length - 1}`);
    return;
  }

  const label = labelsList[labelId];
  const xaiFilePath = `${XAI_PATH}${modelId.replace('.h5', '')}`;
  const shapValuesFile = `${xaiFilePath}/${label}_importance_values.json`;

  isFileExist(shapValuesFile, (ret) => {
    if (!ret) {
      res.status(401).send(`The SHAP values file ${shapValuesFile} does not exist`);
    } else {
      res.sendFile(shapValuesFile);
    }
  });
});

/**
 * Get LIME explanations of a specific model
 */
router.get('/lime/explanations/:modelId/:labelId', (req, res) => {
  const { modelId, labelId } = req.params;
  const labelsList = getLabelsListXAI(modelId);

  if (labelId < 0 || labelId >= labelsList.length) {
    res.status(400).send(`Invalid labelId ${labelId}. It should be between 0 and ${labelsList.length - 1}`);
    return;
  }

  const label = labelsList[labelId];
  const xaiFilePath = `${XAI_PATH}${modelId.replace('.h5', '')}`;
  const limeExpsFile = `${xaiFilePath}/${label}_lime_explanations.json`;

  isFileExist(limeExpsFile, (ret) => {
    if (!ret) {
      res.status(401).send(`The LIME explanations file ${limeExpsFile} does not exist`);
    } else {
      res.sendFile(limeExpsFile);
    }
  });
});

/**
 * Get LIME feature importance values of a specific model
 */
router.get('/lime/importance-values/:modelId/:labelId', (req, res) => {
  const { modelId, labelId } = req.params;
  const labelsList = getLabelsListXAI(modelId);

  if (labelId < 0 || labelId >= labelsList.length) {
    res.status(400).send(`Invalid labelId ${labelId}. It should be between 0 and ${labelsList.length - 1}`);
    return;
  }

  const label = labelsList[labelId];
  const xaiFilePath = `${XAI_PATH}${modelId.replace('.h5', '')}`;
  const limeValuesFile = `${xaiFilePath}/${label}_lime_values.json`;

  isFileExist(limeValuesFile, (ret) => {
    if (!ret) {
      res.status(401).send(`The LIME values file ${limeValuesFile} does not exist`);
    } else {
      res.sendFile(limeValuesFile);
    }
  });
});

module.exports = router;