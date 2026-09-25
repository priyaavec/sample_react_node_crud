# Azure React + Node CRUD Demo

A small full-stack CRUD application using:

- React + Vite frontend
- Node.js + Express backend
- Azure SQL Database
- Azure Blob Storage
- Azure App Service ready backend

## Architecture

React UI
   |
   v
Node.js / Express API
   |
   +--> Azure SQL Database
   |
   +--> Azure Blob Storage

The SQL database stores asset metadata.
Blob Storage stores uploaded files.

## Project structure

```text
azure-react-node-crud/
├── client/
├── server/
├── .gitignore
└── README.md
```

## Features

- Create an asset
- List assets
- Edit an asset
- Delete an asset
- Upload a document
- Download the uploaded document
- Store metadata in Azure SQL
- Store files in Azure Blob Storage

## 1. Configure Azure SQL

Run:

```text
server/sql/create-table.sql
```

against your Azure SQL database.

Then copy:

```text
server/.env.example
```

to:

```text
server/.env
```

and fill in your Azure SQL values.

## 2. Configure Azure Blob Storage

Create a blob container named:

```text
asset-documents
```

Then add the Storage connection string to `server/.env`.

## 3. Start the backend

```bash
cd server
npm install
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

## 4. Start the React frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/assets` | List assets |
| GET | `/api/assets/:id` | Get one asset |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/assets/:id/download` | Download asset document |

## Azure App Service

The Node.js backend is suitable for deployment to Azure App Service.

The React frontend can be deployed to either:

- Azure Static Web Apps
- Azure App Service

For a simple architecture, deploy:

```text
React -> Azure Static Web Apps
Node API -> Azure App Service
Azure SQL -> Azure SQL Database
Files -> Azure Blob Storage
```

Never commit the real `.env` file to GitHub.
