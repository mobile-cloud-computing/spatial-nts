const BASE_PATH =  __dirname;
const LOG_PATH = `${BASE_PATH}/logs/`;
const DEFAULT_LOG_PATH = `${BASE_PATH}/logs/all-logs.log`;
const MMT_PATH = `${BASE_PATH}/mmt/`;
const REPORT_PATH = `${MMT_PATH}outputs/`;
const PCAP_PATH = `${MMT_PATH}pcaps/`;
const MMT_PROBE_CONFIG_PATH = `${MMT_PATH}mmt-probe.conf`;
const PCAP_EXTENSIONS = ['.pcap', '.pcapng', '.cap'];
// Deep learning constants paths
const DEEP_LEARNING_PATH = `${BASE_PATH}/deep-learning/`;
const MODEL_PATH = `${DEEP_LEARNING_PATH}models/`;
const PREDICTION_PATH = `${DEEP_LEARNING_PATH}predictions/`;
const TRAINING_PATH = `${DEEP_LEARNING_PATH}trainings/`;
const XAI_PATH = `${DEEP_LEARNING_PATH}xai/`;
const ATTACKS_PATH = `${DEEP_LEARNING_PATH}attacks/`;
const DATASETS_PATH = `${DEEP_LEARNING_PATH}datasets/`;
const PYTHON_CMD = `python3`;

const AC_PATH = `${BASE_PATH}/activity-classification/`;
const AC_TRAINING_PATH = `${AC_PATH}trainings/`;

const OUTPUT_DIRS = [TRAINING_PATH, PREDICTION_PATH, XAI_PATH, ATTACKS_PATH];

const AD_OUTPUT_LABELS = ["Normal traffic", "Malware traffic"];
const AD_OUTPUT_LABELS_SHORT = ["Normal", "Malware"];
const AD_OUTPUT_LABELS_XAI = ["", "Malware"];
const AC_OUTPUT_LABELS = ["Web", "Interactive", "Video"];
module.exports = {
  PYTHON_CMD,
  AC_PATH, AC_TRAINING_PATH,
  MMT_PATH,
  REPORT_PATH,
  MMT_PROBE_CONFIG_PATH,
  LOG_PATH,
  DEFAULT_LOG_PATH,
  PCAP_PATH,
  MODEL_PATH,
  DEEP_LEARNING_PATH,
  PREDICTION_PATH,
  TRAINING_PATH,
  XAI_PATH,
  ATTACKS_PATH,
  DATASETS_PATH,
  PCAP_EXTENSIONS,
  OUTPUT_DIRS,
  AD_OUTPUT_LABELS,
  AD_OUTPUT_LABELS_SHORT,
  AD_OUTPUT_LABELS_XAI,
  AC_OUTPUT_LABELS
};


// FROM ubuntu:20.04
//
// # Set non-interactive frontend
// ARG DEBIAN_FRONTEND=noninteractive

// # Configure apt to avoid proxy issues
// RUN echo "Acquire::http::Pipeline-Depth 0; \n Acquire::http::No-Cache true; \n Acquire::BrokenProxy    true;" > /etc/apt/apt.conf.d/99fixbadproxy

//
// # Install essential packages
// RUN apt-get update -y && \
//     apt-get install -y git wget cmake gcc g++ cpp curl software-properties-common graphviz libconfuse-dev libpcap-dev libxml2-dev net-tools && \
//     add-apt-repository ppa:deadsnakes/ppa -y && \
//     apt-get install -y python3.8 python3.8-venv && \
//     curl -sL https://deb.nodesource.com/setup_19.x | bash && \
//     apt-get install -y nodejs && \
//     npm install pm2 -g && \
//     rm -rf /var/lib/apt/lists/*
//
// # Install pip
// RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
//     python3.8 get-pip.py pip==20.0.2 && \
//     rm get-pip.py
//
// # Check pip version
// RUN pip3 --version
//
// # Set working directory
// WORKDIR /maip-app
//
// # Copy app source
// COPY . .
//
// # Set the LD_PRELOAD environment variable to preload libgomp
// ENV LD_PRELOAD=/lib/aarch64-linux-gnu/libgomp.so.1
// ENV DOCKER_ENV=true

// # Install Python dependencies
// RUN set -e && \
//     python3.8 -m pip install --upgrade pip && \
//     python3.8 -m pip install -r src/server/deep-learning/requirements.txt
//
// # Install Node.js dependencies
// RUN cd /maip-app && npm install
//
// # Copy resources and install MMT packages
// RUN dpkg -i src/server/mmt-packages/mmt-dpi*.deb && \
//     dpkg -i src/server/mmt-packages/mmt-security*.deb && \
//     dpkg -i src/server/mmt-packages/mmt-probe*.deb 2>/dev/null || true && \
//     ldconfig
//
// # Set environment variable
// ENV DOCKER_ENV=true
//
// # Expose port
// EXPOSE 31057
//
// # Start command
// CMD ["./start-maip.sh"]
