import dotenv from "dotenv";

import {
  BlobServiceClient,
  StorageSharedKeyCredential
} from "@azure/storage-blob";

import {
  DefaultAzureCredential
} from "@azure/identity";

import crypto from "crypto";
import path from "path";

dotenv.config();

const containerName =
  process.env.AZURE_STORAGE_CONTAINER ||
  "asset-documents";

function getBlobServiceClient() {
  const connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (connectionString) {
    return BlobServiceClient.fromConnectionString(
      connectionString
    );
  }

  const accountUrl =
    process.env.AZURE_STORAGE_ACCOUNT_URL;

  if (!accountUrl) {
    throw new Error(
      "Set either AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL."
    );
  }

  const credential =
    new DefaultAzureCredential();

  return new BlobServiceClient(
    accountUrl,
    credential
  );
}

async function getContainerClient() {
  const serviceClient =
    getBlobServiceClient();

  const containerClient =
    serviceClient.getContainerClient(
      containerName
    );

  await containerClient.createIfNotExists();

  return containerClient;
}

export async function uploadFile(file) {
  if (!file) {
    throw new Error(
      "No file supplied for upload."
    );
  }

  const container =
    await getContainerClient();

  const extension =
    path.extname(file.originalname || "");

  const blobName =
    `${crypto.randomUUID()}${extension}`;

  const blob =
    container.getBlockBlobClient(blobName);

  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType:
        file.mimetype ||
        "application/octet-stream"
    }
  });

  return {
    blobName,
    originalFileName:
      file.originalname,
    contentType:
      file.mimetype ||
      "application/octet-stream"
  };
}

export async function deleteBlob(blobName) {
  if (!blobName) {
    return;
  }

  const container =
    await getContainerClient();

  const blob =
    container.getBlockBlobClient(blobName);

  await blob.deleteIfExists({
    deleteSnapshots: "include"
  });
}

export async function downloadBlob(blobName) {
  if (!blobName) {
    throw new Error(
      "Blob name is required."
    );
  }

  const container =
    await getContainerClient();

  const blob =
    container.getBlockBlobClient(blobName);

  const response =
    await blob.download();

  if (!response.readableStreamBody) {
    throw new Error(
      "Blob download returned no stream."
    );
  }

  return response.readableStreamBody;
}
