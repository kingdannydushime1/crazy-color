export const RYB = {
  R: 0xff384b, // Red
  B: 0x3888ff, // Blue
  Y: 0xffcc00  // Yellow
};

export type Dose = { r: number; b: number; y: number };

// Subtractive paint blending in CMY space for hyper-realistic fluid chemistry
export const mixRYB = (dose: Dose): number => {
  const { r, b, y } = dose;
  const total = r + b + y;
  if (total === 0) return 0xffffff;

  const rw = r / total;
  const bw = b / total;
  const yw = y / total;

  // Primaries in RGB
  const rRGB = { r: 255, g: 56, b: 75 };
  const bRGB = { r: 56, g: 136, b: 255 };
  const yRGB = { r: 255, g: 204, b: 0 };

  // Convert to CMY subtractive space
  const cr = 1 - rRGB.r / 255; const cg = 1 - rRGB.g / 255; const cb = 1 - rRGB.b / 255;
  const br = 1 - bRGB.r / 255; const bg = 1 - bRGB.g / 255; const bb = 1 - bRGB.b / 255;
  const yr = 1 - yRGB.r / 255; const yg = 1 - yRGB.g / 255; const yb = 1 - yRGB.b / 255;

  const mixC = rw * cr + bw * br + yw * yr;
  const mixM = rw * cg + bw * bg + yw * yg;
  const mixY = rw * cb + bw * bb + yw * yb;

  // Convert back to RGB
  let finalR = Math.round((1 - mixC) * 255);
  let finalG = Math.round((1 - mixM) * 255);
  let finalB = Math.round((1 - mixY) * 255);

  finalR = Math.max(0, Math.min(255, finalR));
  finalG = Math.max(0, Math.min(255, finalG));
  finalB = Math.max(0, Math.min(255, finalB));

  return (finalR << 16) | (finalG << 8) | finalB;
};

export const getTargetName = (color: number): string => {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;

  if (r > 200 && g < 80 && b < 100) return 'VIBRANT RED';
  if (r < 80 && g < 150 && b > 200) return 'DEEP BLUE';
  if (r > 200 && g > 180 && b < 50) return 'BRIGHT YELLOW';
  
  if (r > 180 && g > 90 && g < 160 && b < 50) return 'SUNSET ORANGE';
  if (r < 80 && g > 160 && b < 120) return 'EMERALD GREEN';
  if (r > 120 && g < 80 && b > 140) return 'ROYAL PURPLE';
  
  if (r > 100 && r < 180 && g > 140 && b > 180) return 'TURQUOISE SHADE';
  if (r > 180 && g < 100 && b > 140) return 'HOT MAGENTA';
  if (r < 120 && g < 100 && b < 100 && r > 40 && g > 20) return 'EARTHEN BROWN';
  if (r > 180 && g > 180 && b > 180) return 'PASTEL WHITE';

  // Dynamic names based on dominant colors
  if (r > g && r > b) {
    if (g > b) return 'WARM AMBER';
    return 'LIVELY CORAL';
  }
  if (g > r && g > b) {
    if (r > b) return 'FOREST LIME';
    return 'OCEAN TEAL';
  }
  if (b > r && b > g) {
    if (r > g) return 'VIOLET SKY';
    return 'COBALT MIST';
  }

  return 'MYSTIC BLEND';
};

// Generates the base target recipe for any given level seed
export const generateTargetBase = (level: number): Dose => {
  // Purely deterministic random generator based on level seed
  let seedValue = level * 15485863; // a prime number
  const lcgRand = () => {
    // Standard LCG parameters for stable pseudo-random decimals
    seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
    return seedValue / 4294967296;
  };

  // Specific tutorial starts (level 1-5)
  if (level === 1) return { r: 1, b: 0, y: 0 }; // Pure Red (1 drop)
  if (level === 2) return { r: 0, b: 1, y: 0 }; // Pure Blue (1 drop)
  if (level === 3) return { r: 0, b: 0, y: 1 }; // Pure Yellow (1 drop)
  if (level === 4) return { r: 1, b: 0, y: 1 }; // Sunset Orange (2 drops: R+Y, distinct because 1 and 1? Wait, let's make it 1 Red, 1 Yellow, which is 2 colors, but wait, if we want them different, we can let the tutorial be simple or make it distinct too! Let's keep tutorials simple manually, but for procedural levels, enforce unequal drop counts).
  if (level === 5) return { r: 0, b: 1, y: 1 }; // Emerald Green (2 drops: B+Y)

  // Determine active colors count based on progressive level difficulty (stays engaging!)
  let numColors = 1;
  if (level <= 6) {
    numColors = 1;
  } else if (level <= 15) {
    numColors = lcgRand() < 0.3 ? 1 : 2;
  } else {
    // progressive probability
    const p = lcgRand();
    if (p < 0.1) {
      numColors = 1;
    } else if (p < 0.55) {
      numColors = 2;
    } else {
      numColors = 3;
    }
  }

  // Determine max allowed drops overall (strictly never exceeds 4 as requested!)
  let maxTotalDrops = 4;
  if (level <= 10) {
    maxTotalDrops = 3; // Simple early levels (1-3 drops max)
  } else {
    maxTotalDrops = 4; // High complexity (1-4 drops max)
  }

  // Choose active flags randomly
  const activeKeys: ('r' | 'b' | 'y')[] = [];
  const allKeys: ('r' | 'b' | 'y')[] = ['r', 'b', 'y'];
  
  // Shuffle allKeys deterministically using lcgRand
  for (let i = allKeys.length - 1; i > 0; i--) {
    const j = Math.floor(lcgRand() * (i + 1));
    const temp = allKeys[i];
    allKeys[i] = allKeys[j];
    allKeys[j] = temp;
  }

  // Take the first numColors keys
  for (let i = 0; i < numColors; i++) {
    activeKeys.push(allKeys[i]);
  }

  // Distribute total drops among active keys
  const targetTotalDrops = Math.floor(lcgRand() * (maxTotalDrops - numColors + 1)) + numColors;
  
  const dose: Dose = { r: 0, b: 0, y: 0 };
  
  // Start by giving each active key 1 drop
  activeKeys.forEach(k => {
    dose[k] = 1;
  });

  // Distribute remaining drops
  let remaining = targetTotalDrops - numColors;
  while (remaining > 0) {
    const chosenKey = activeKeys[Math.floor(lcgRand() * activeKeys.length)];
    dose[chosenKey]++;
    remaining--;
  }

  // Ensure total never exceeds 4
  const sum = dose.r + dose.b + dose.y;
  if (sum > 4) {
    // Prune excess starting with the largest
    const activeSorted = [...activeKeys].sort((a, b) => dose[b] - dose[a]);
    let overage = sum - 4;
    for (const key of activeSorted) {
      if (overage <= 0) break;
      const dec = Math.min(overage, dose[key] - 1);
      dose[key] -= dec;
      overage -= dec;
    }
  }

  // Strict check: if 2 colors are active, their quantities must not be equal!
  if (numColors === 2 && activeKeys.length === 2) {
    const k1 = activeKeys[0];
    const k2 = activeKeys[1];
    if (dose[k1] === dose[k2]) {
      // Equal! e.g., 1 and 1, or 2 and 2
      const currentSum = dose.r + dose.b + dose.y;
      if (currentSum + 1 <= 4) {
        // e.g. 1 and 1 -> make it 1 and 2
        dose[k2]++;
      } else {
        // e.g. 2 and 2 -> make it 2 and 1
        dose[k2]--;
      }
    }
  }

  return dose;
};

// Generates a fully playable target recipe for any given level (1 to 1000+)
export const generateTarget = (level: number): Dose => {
  // Let's generate a list of the last 6 generated doses to prevent duplicates
  const previousTargets: string[] = [];
  
  // We compute the previous 6 targets for seeds max(1, level - 6) to level - 1
  const startCheck = Math.max(1, level - 6);
  for (let s = startCheck; s < level; s++) {
    const rawTarget = generateTargetBase(s);
    previousTargets.push(`${rawTarget.r},${rawTarget.b},${rawTarget.y}`);
  }

  let attempt = 0;
  let targetDose: Dose;
  while (attempt < 50) {
    targetDose = generateTargetBase(level + attempt * 17);
    const key = `${targetDose.r},${targetDose.b},${targetDose.y}`;
    if (!previousTargets.includes(key)) {
      return targetDose;
    }
    attempt++;
  }
  
  return generateTargetBase(level); // Fallback
};

// Continuous Similarity percentage calculated from Euclidean RGB Paint Space Distance
export const getSimilarityPercentage = (current: Dose, target: Dose): number => {
  const currentTotal = current.r + current.b + current.y;
  const targetTotal = target.r + target.b + target.y;

  if (currentTotal === 0 && targetTotal === 0) return 100;
  if (currentTotal === 0 || targetTotal === 0) return 0;

  // Mix the RGB colors
  const colorCur = mixRYB(current);
  const colorTgt = mixRYB(target);

  const rC = (colorCur >> 16) & 255;
  const gC = (colorCur >> 8) & 255;
  const bC = colorCur & 255;

  const rT = (colorTgt >> 16) & 255;
  const gT = (colorTgt >> 8) & 255;
  const bT = colorTgt & 255;

  // Euclidean distance in RGB color cube
  const dist = Math.sqrt(
    Math.pow(rC - rT, 2) +
    Math.pow(gC - gT, 2) +
    Math.pow(bC - bT, 2)
  );

  // Maximum distance between any two colors is ~441.67
  const maxDist = 441.67;
  let score = 100 - (dist / maxDist) * 100;

  // Let's add extra precision to the mix ratios!
  // If ratios match exactly, ensure it is 100%
  const ratCurR = current.r / currentTotal;
  const ratCurB = current.b / currentTotal;
  const ratCurY = current.y / currentTotal;

  const ratTgtR = target.r / targetTotal;
  const ratTgtB = target.b / targetTotal;
  const ratTgtY = target.y / targetTotal;

  const ratioDiff = Math.abs(ratCurR - ratTgtR) + Math.abs(ratCurB - ratTgtB) + Math.abs(ratCurY - ratTgtY);

  if (ratioDiff < 0.01) {
    return 100;
  }

  // Deduct progressively for ratio differences
  score -= (ratioDiff * 30);

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const Colors = {
  RYB,
  mixRYB,
  getTargetName,
  generateTarget,
  getSimilarityPercentage
};
