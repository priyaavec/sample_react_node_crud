import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

import { getPool, sql } from "./db.js";
import {
  uploadFile,
  deleteBlob,
  downloadBlob
} from "./blob.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*"
  })
);

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Azure React + Node CRUD API is running"
  });
});

app.get("/api/assets", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        Id,
        AssetName,
        AssetType,
        Location,
        Description,
        BlobName,
        OriginalFileName,
        ContentType,
        CreatedAt,
        UpdatedAt
      FROM Assets
      ORDER BY Id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("GET /api/assets error:", error);

    res.status(500).json({
      message: "Failed to load assets.",
      error: error.message
    });
  }
});

app.get("/api/assets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid asset id."
      });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT *
        FROM Assets
        WHERE Id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        message: "Asset not found."
      });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("GET /api/assets/:id error:", error);

    res.status(500).json({
      message: "Failed to load asset.",
      error: error.message
    });
  }
});

app.post(
  "/api/assets",
  upload.single("file"),
  async (req, res) => {
    let uploadedBlobName = null;

    try {
      const {
        assetName,
        assetType,
        location,
        description
      } = req.body;

      if (!assetName?.trim()) {
        return res.status(400).json({
          message: "Asset name is required."
        });
      }

      let blobData = {
        blobName: null,
        originalFileName: null,
        contentType: null
      };

      if (req.file) {
        blobData = await uploadFile(req.file);
        uploadedBlobName = blobData.blobName;
      }

      const pool = await getPool();

      const result = await pool
        .request()
        .input(
          "assetName",
          sql.NVarChar(200),
          assetName
        )
        .input(
          "assetType",
          sql.NVarChar(100),
          assetType || null
        )
        .input(
          "location",
          sql.NVarChar(200),
          location || null
        )
        .input(
          "description",
          sql.NVarChar(sql.MAX),
          description || null
        )
        .input(
          "blobName",
          sql.NVarChar(500),
          blobData.blobName
        )
        .input(
          "originalFileName",
          sql.NVarChar(255),
          blobData.originalFileName
        )
        .input(
          "contentType",
          sql.NVarChar(150),
          blobData.contentType
        )
        .query(`
          INSERT INTO Assets (
            AssetName,
            AssetType,
            Location,
            Description,
            BlobName,
            OriginalFileName,
            ContentType
          )
          OUTPUT INSERTED.*
          VALUES (
            @assetName,
            @assetType,
            @location,
            @description,
            @blobName,
            @originalFileName,
            @contentType
          )
        `);

      res.status(201).json(result.recordset[0]);
    } catch (error) {
      console.error("POST /api/assets error:", error);

      if (uploadedBlobName) {
        try {
          await deleteBlob(uploadedBlobName);
        } catch (cleanupError) {
          console.error(
            "Blob cleanup failed:",
            cleanupError
          );
        }
      }

      res.status(500).json({
        message: "Failed to create asset.",
        error: error.message
      });
    }
  }
);

app.put(
  "/api/assets/:id",
  upload.single("file"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid asset id."
        });
      }

      const {
        assetName,
        assetType,
        location,
        description
      } = req.body;

      if (!assetName?.trim()) {
        return res.status(400).json({
          message: "Asset name is required."
        });
      }

      const pool = await getPool();

      const existingResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT *
          FROM Assets
          WHERE Id = @id
        `);

      if (!existingResult.recordset.length) {
        return res.status(404).json({
          message: "Asset not found."
        });
      }

      const existing = existingResult.recordset[0];

      let blobName = existing.BlobName;
      let originalFileName = existing.OriginalFileName;
      let contentType = existing.ContentType;

      if (req.file) {
        const uploaded = await uploadFile(req.file);

        if (existing.BlobName) {
          try {
            await deleteBlob(existing.BlobName);
          } catch (error) {
            console.error(
              "Could not delete old blob:",
              error
            );
          }
        }

        blobName = uploaded.blobName;
        originalFileName = uploaded.originalFileName;
        contentType = uploaded.contentType;
      }

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input(
          "assetName",
          sql.NVarChar(200),
          assetName
        )
        .input(
          "assetType",
          sql.NVarChar(100),
          assetType || null
        )
        .input(
          "location",
          sql.NVarChar(200),
          location || null
        )
        .input(
          "description",
          sql.NVarChar(sql.MAX),
          description || null
        )
        .input(
          "blobName",
          sql.NVarChar(500),
          blobName
        )
        .input(
          "originalFileName",
          sql.NVarChar(255),
          originalFileName
        )
        .input(
          "contentType",
          sql.NVarChar(150),
          contentType
        )
        .query(`
          UPDATE Assets
          SET
            AssetName = @assetName,
            AssetType = @assetType,
            Location = @location,
            Description = @description,
            BlobName = @blobName,
            OriginalFileName = @originalFileName,
            ContentType = @contentType,
            UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE Id = @id
        `);

      res.json(result.recordset[0]);
    } catch (error) {
      console.error("PUT /api/assets/:id error:", error);

      res.status(500).json({
        message: "Failed to update asset.",
        error: error.message
      });
    }
  }
);

app.delete("/api/assets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid asset id."
      });
    }

    const pool = await getPool();

    const existingResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT BlobName
        FROM Assets
        WHERE Id = @id
      `);

    if (!existingResult.recordset.length) {
      return res.status(404).json({
        message: "Asset not found."
      });
    }

    const blobName =
      existingResult.recordset[0].BlobName;

    if (blobName) {
      try {
        await deleteBlob(blobName);
      } catch (error) {
        console.error(
          "Could not delete blob:",
          error
        );
      }
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM Assets
        WHERE Id = @id
      `);

    res.json({
      message: "Asset deleted."
    });
  } catch (error) {
    console.error("DELETE /api/assets/:id error:", error);

    res.status(500).json({
      message: "Failed to delete asset.",
      error: error.message
    });
  }
});

app.get(
  "/api/assets/:id/download",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid asset id."
        });
      }

      const pool = await getPool();

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT
            BlobName,
            OriginalFileName,
            ContentType
          FROM Assets
          WHERE Id = @id
        `);

      if (!result.recordset.length) {
        return res.status(404).json({
          message: "Asset not found."
        });
      }

      const asset = result.recordset[0];

      if (!asset.BlobName) {
        return res.status(404).json({
          message: "No document attached."
        });
      }

      const stream = await downloadBlob(
        asset.BlobName
      );

      res.setHeader(
        "Content-Type",
        asset.ContentType ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asset.OriginalFileName || "document"}"`
      );

      stream.pipe(res);
    } catch (error) {
      console.error(
        "GET /api/assets/:id/download error:",
        error
      );

      res.status(500).json({
        message: "Failed to download file.",
        error: error.message
      });
    }
  }
);

app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});
