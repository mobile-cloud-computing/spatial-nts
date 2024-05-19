# spatial-backend

This is the Backend for spatial

## Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn package manager
- Docker installed if you wish to containerize the application

## Installation

Clone the repository to your local machine:

```bash
git clone https://github.com/toluelemson/spatial-backend
```

Create and activate environment Variable:

```bash
python3 -m venv spatial_env
source spatial_env/bin/activate
```

Change directory to the cloned repository:

```bash
cd spartial-backend
```

Checkout the feature branch:

```bash
git checkout authentication
```

Install the necessary dependencies:

```bash
npm install
```

or if you're using Yarn:

```bash
yarn install
```

Install python requirements:

```bash
cd src/server/deep-learning
pip install -r requirements.txt
```

## Configuration

Before running Spatial, you need to set up the following environment variables. Create a `.env` file in the root directory
R
```env
SERVER_HOST=0.0.0.0
SERVER_PORT=31057
MODE=API
```

## Running the Application Locally

Start the development server:

```bash
npm start
```

or with Yarn:

```bash
yarn start
```

## Docker Support

### Building the Docker Image

To build a Docker image of Spatial, run:

```bash
sudo docker-compose build .
```

### Running the Docker Container

To run Spatial Frontend as a Docker container:

```bash
sudo docker-compose up
```

Spatial backend will now be accessible at `http://localhost:31057/`.


## Contributing

We welcome contributions to this project. Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/Feature`).
3. Make changes and commit them (`git commit -m 'Add some Feature'`).
4. Push to the branch (`git push origin feature/Feature`).
5. Open a Pull Request.# spatial-backend
