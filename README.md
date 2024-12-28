# scratch-desktop

Scratch 3.0 as a standalone desktop application


# Setting Up and Building Scratch Desktop

Follow the steps below to set up and build Scratch Desktop on your system.

## 1. Install Node.js (Version 16)

Use the following commands to install Node.js version 16 using NVM:

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 16
```

## 2. Clone the Repository

Clone the Scratch Desktop repository and navigate into the project directory:

```bash
git clone https://github.com/Teakzieas/scratch-desktop.git
cd scratch-desktop
```

## 3. Run Pi Configuration

The following operations are performed by the Pi configuration script:

\-- Resize the Swap File to 2048 MB (in case a 4GB Pi does not have enough memory to build)

\-- Install Java (required for google-closure-compiler)

\-- Install Ruby and FPM (required for electron-builder to export)

```bash
npm run Piconfig
```

## 4. Install Project Dependencies

Install the required packages using the following command:

```bash
npm install --unsafe-perm
```

## 5. Running the Application

To start the application, use the following command:

```bash
npm run start
```

## 6. Build the Application

To build the application, execute the following commands:

```bash
export USE_SYSTEM_FPM="true"
NODE_OPTIONS=--max-old-space-size=4096 npm run dist:rpi64
```

## 7. Saving Modifications

If you've made changes to StemHat files in the `ScratchVM` or `ScratchGUI`, save them with the following commands:

```bash
npm run Stemhat:save
git add -A
git commit -m "Your commit message"
git push
```

---




