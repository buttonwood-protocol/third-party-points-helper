import fs from 'node:fs/promises';
import path from 'node:path';
import { UserBreakdown } from './getUserBreakdown.ts';

const outputDir = path.join('.', 'output');

export async function exportUserBreakdown(userBreakdown: UserBreakdown) {
  try {
    await fs.mkdir(outputDir);
  } catch (err) {
    // Ignore error from dir not existing
  }

  const fileText = JSON.stringify(
    userBreakdown,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    '  ',
  );
  const { chainId, inputTokenAddress, timestamp } = userBreakdown;
  const outputFile = path.join(
    outputDir,
    `user-breakdown-${chainId}-${inputTokenAddress}-${timestamp}.json`,
  );

  await fs.writeFile(outputFile, fileText, 'utf8');
  console.log(`Output saved to ${outputFile}`);
}
