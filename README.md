# scratch-desktop

Scratch 3.0 as a standalone desktop application

## Developer Instructions

This version of scratch will apply patches (in the patches folder) to node_modules:

- scratch-blocks
- scratch-gui
- scratch-vm

These patches are based on the files in ./raspberry-pi though the patch creation process is not scripted.

### Releasing a new version

For Raspberry Pi specific builds please note [**Making-a-Raspberry-Pi-Specific-Build**](#making-a-raspberry-pi-specific-build)

Let's assume that you want to make a new release, version `3.999.0`, corresponding to `scratch-gui` version
`0.1.0-prerelease.20yymmdd`.

1. Merge `scratch-gui`:
   1. `cd scratch-gui`
   2. `git pull --all --tags`
   3. `git checkout scratch-desktop`
   4. `git merge 0.1.0-prerelease.20yymmdd`
   5. Resolve conflicts if necessary
   6. `git tag scratch-desktop-v3.999.0`
   7. `git push`
   8. `git push --tags`
2. Prep `scratch-desktop`:
   1. `cd scratch-desktop`
   2. `git pull --all --tags`
   3. `git checkout develop`
   4. `npm install --save-dev 'scratch-gui@github:scratchfoundation/scratch-gui#scratch-desktop-v3.999.0'`
   5. `git add package.json package-lock.json`
   6. Make sure the app works, the diffs look reasonable, etc.
   7. `git commit -m "bump scratch-gui to scratch-desktop-v3.999.0"`
   8. `npm version 3.999.0`
   9. `git push`
   10. `git push --tags`
3. Wait for the CI build and collect the release from the build artifacts

### A note about `scratch-gui`

Eventually, the `scratch-desktop` branch of the Scratch GUI repository will be merged with that repository's main
development line. For now, though, the `scratch-desktop` branch holds a few changes that are necessary for the Scratch
app to function correctly but are not yet merged into the main development branch. If you only intend to build or work
on the `scratch-desktop` repository then you can ignore this, but if you intend to work on `scratch-gui` as well, make
sure you use the `scratch-desktop` branch there.

Previously it was necessary to explicitly build `scratch-gui` before building `scratch-desktop`. This is no longer
necessary and the related build scripts, such as `build-gui`, have been removed.

### Prepare media library assets

In the `scratch-desktop` directory, run `npm run fetch`. Re-run this any time you update `scratch-gui` or make any
other changes which might affect the media libraries.

### Run in development mode

`npm run start`

### Make a packaged build

`npm run dist`


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

## 5. Run Pi Configuration

The following operations are performed by the Pi configuration script:

\-- Resize the Swap File to 2048 MB (in case a 4GB Pi does not have enough memory to build)

\-- Install Java (required for google-closure-compiler)

\-- Install Ruby and FPM (required for electron-builder to export)

```bash
npm run Piconfig
```

## 6. Install Project Dependencies

Install the required packages using the following command:

```bash
npm install --unsafe-perm
```

## 7. Running the Application

To start the application, use the following command:

```bash
npm run start
```

## 8. Build the Application

To build the application, execute the following commands:

```bash
export USE_SYSTEM_FPM="true"
NODE_OPTIONS=--max-old-space-size=4096 npm run dist:rpi64
```

## 9. Saving Modifications

If you've made changes to StemHat files in the `ScratchVM` or `ScratchGUI`, save them with the following commands:

```bash
npm run Stemhat:save
git add -A
git commit -m "Your commit message"
git push
```

---




