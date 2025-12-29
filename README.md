# LearnHub - Dockerized

This project is containerized using Docker. Follow these instructions to run the application.

## Prerequisites

- Docker Desktop installed (https://www.docker.com/products/docker-desktop)
- Docker Compose installed (usually included with Docker Desktop)

## Installing Docker

If Docker is not installed on your system:

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
2. Install the application
3. Start Docker Desktop and wait for it to fully initialize
4. You should see the Docker whale icon in your system tray when it's running

## Running the Application

1. Make sure Docker Desktop is running
2. Make sure you have a `.env` file in the root directory with your environment variables (JWT_SECRET, etc.)
3. Open a terminal/command prompt in this directory
4. Build and start the services:
   ```bash
   docker-compose up --build
   ```

5. The application will be available at `http://localhost:3000`

## Alternative: Running in Detached Mode

To run the services in the background:

```bash
docker-compose up --build -d
```

## Stopping the Application

```bash
docker-compose down
```

## Building Only

To build the Docker images without starting the services:

```bash
docker-compose build
```

## Notes

- The SQLite database file is persisted in the `./backend/data` directory
- The application runs on port 3000
- The database file will persist between container restarts