// Step Definition for TensorFlow Model Feature
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import * as tf from '@tensorflow/tfjs-node'; // Use tfjs-node for Node.js support
import * as fs from 'fs';
import path from 'path';

let model: tf.LayersModel;
let predictions: { image: string, label: string }[];
const KNOWN_IMAGES_DIR = path.resolve(__dirname, '../support/images/known');
const EXPECTED_LABELS = [
  { image: 'cat.jpg', label: 'cat' },
  { image: 'dog.jpg', label: 'dog' }
];

// Load a pre-trained image classification model
async function loadImageClassificationModel() {
  return await tf.loadLayersModel('file://./src/support/model/image-classification-model/model.json');
}

// Predict label for an image
async function predictImageLabel(model: tf.LayersModel, imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  let imageTensor = tf.node.decodeImage(imageBuffer);

  // Resize the image to match the model input [100, 100, 3]
  imageTensor = tf.image.resizeBilinear(imageTensor, [100, 100]);

  // Expand dimensions to match model input [1, 100, 100, 3]
  imageTensor = imageTensor.expandDims(0);

  const predictionTensor = model.predict(imageTensor) as tf.Tensor;
  const predictionArray = predictionTensor.dataSync();
  const predictedIndex = predictionArray.indexOf(Math.max(...predictionArray));

  // Assuming the model was trained to classify 'cat' and 'dog'
  const LABELS = ['cat', 'dog'];
  return LABELS[predictedIndex];
}

Given('a pre-trained image classification model is loaded', async () => {
  model = await loadImageClassificationModel();
});

When('I input a set of known images', async () => {
  predictions = [];
  for (const { image } of EXPECTED_LABELS) {
    const imagePath = path.join(KNOWN_IMAGES_DIR, image);
    const label = await predictImageLabel(model, imagePath);
    predictions.push({ image, label });
  }
});

Then('the predicted labels should match the expected labels with at least {int}% accuracy', (accuracyThreshold: number) => {
  let correctPredictions = 0;
  for (const { image, label } of predictions) {
    const expectedLabel = EXPECTED_LABELS.find((el) => el.image === image)?.label;
    if (expectedLabel && expectedLabel === label) {
      correctPredictions++;
    }
  }
  const accuracy = (correctPredictions / EXPECTED_LABELS.length) * 100;
  expect(accuracy).toBeGreaterThanOrEqual(accuracyThreshold);
});
