# CloudVault AI

CloudVault AI is a distributed cloud storage system built using the MERN stack.

## Features

- JWT Authentication
- File Upload & Download
- File Chunking
- Multi-Node Storage
- Chunk Replication
- Fault Tolerance
- Automatic Replica Recovery
- Search Files
- Storage Analytics Dashboard
- Node Health Monitoring

## Tech Stack

Frontend:
- React
- Axios
- CSS

Backend:
- Node.js
- Express.js
- MySQL
- JWT

## Architecture

File Upload
↓
Chunk Creation
↓
Store Across Nodes
↓
Create Replicas
↓
Failure Detection
↓
Replica Recovery
↓
File Reconstruction

## Fault Tolerance Demo

A chunk can be intentionally deleted using the failure simulation endpoint.

During download, if a chunk is unavailable, the system automatically retrieves the replica and reconstructs the file successfully.

## Author

Samarth M S