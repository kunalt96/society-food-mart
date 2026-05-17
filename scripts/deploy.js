const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '.deploy-state.json');

// Default state structure
const defaultState = {
  buildAndroid: false,
  buildIos: false,
  submitAndroid: false,
  submitIos: false,
};

// Load or initialize state
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return { ...defaultState, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Could not read state file, starting fresh.');
      return { ...defaultState };
    }
  }
  return { ...defaultState };
}

// Save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Execute command
function runCommand(command, stepMessage) {
  console.log(`\n========================================`);
  console.log(`🚀 RUNNING: ${stepMessage}`);
  console.log(`> ${command}`);
  console.log(`========================================\n`);
  
  execSync(command, { stdio: 'inherit' });
}

// Check EAS login
function checkLogin() {
  try {
    execSync('eas whoami', { stdio: 'pipe' });
    console.log('✅ Logged into EAS successfully.');
  } catch (e) {
    console.error('❌ You are not logged into EAS. Please run `eas login` first.');
    process.exit(1);
  }
}

async function runDeploy() {
  const args = process.argv.slice(2);
  const platform = args.includes('--platform') 
    ? args[args.indexOf('--platform') + 1] 
    : 'all';

  if (!['android', 'ios', 'all'].includes(platform)) {
    console.error('Invalid platform. Use: --platform android|ios|all');
    process.exit(1);
  }

  console.log('Starting resumable EAS Deployment Pipeline...');
  checkLogin();
  
  let state = loadState();

  try {
    // --- BUILD ANDROID ---
    if ((platform === 'all' || platform === 'android') && !state.buildAndroid) {
      runCommand('eas build --platform android --profile production --non-interactive', 'Building Android');
      state.buildAndroid = true;
      saveState(state);
      console.log('✅ Android Build Complete.\n');
    } else if (state.buildAndroid) {
      console.log('⏭️  Skipping Android Build (Already completed).');
    }

    // --- BUILD IOS ---
    if ((platform === 'all' || platform === 'ios') && !state.buildIos) {
      runCommand('eas build --platform ios --profile production --non-interactive', 'Building iOS');
      state.buildIos = true;
      saveState(state);
      console.log('✅ iOS Build Complete.\n');
    } else if (state.buildIos) {
      console.log('⏭️  Skipping iOS Build (Already completed).');
    }

    // --- SUBMIT ANDROID ---
    if ((platform === 'all' || platform === 'android') && !state.submitAndroid) {
      runCommand('eas submit -p android --latest --non-interactive', 'Submitting Android to Play Store');
      state.submitAndroid = true;
      saveState(state);
      console.log('✅ Android Submission Complete.\n');
    } else if (state.submitAndroid) {
      console.log('⏭️  Skipping Android Submission (Already completed).');
    }

    // --- SUBMIT IOS ---
    if ((platform === 'all' || platform === 'ios') && !state.submitIos) {
      runCommand('eas submit -p ios --latest --non-interactive', 'Submitting iOS to App Store');
      state.submitIos = true;
      saveState(state);
      console.log('✅ iOS Submission Complete.\n');
    } else if (state.submitIos) {
      console.log('⏭️  Skipping iOS Submission (Already completed).');
    }

    console.log('\n🎉 ALL DONE! Deployment finished successfully.');
    
    // Clear state on full success
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('🧹 Cleared deployment state file.');
    }

  } catch (error) {
    console.error('\n❌ ERROR: Deployment step failed!');
    console.error('The state has been saved. Run this script again to resume from this step.');
    process.exit(1);
  }
}

runDeploy();
