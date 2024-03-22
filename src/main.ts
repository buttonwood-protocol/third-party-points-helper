import { getAddress } from 'viem';
import { getChainId } from './chains.ts';
import { exportUserBreakdown } from './exportUserBreakdown.ts';
import { getUserBreakdown } from './getUserBreakdown.ts';
import { validateUserBreakdown } from './validateUserBreakdown.ts';

async function main() {
  const [, , chainIdRaw, tokenAddressRaw] = process.argv;
  const chainId = getChainId(parseInt(chainIdRaw, 10));
  const tokenAddress = getAddress(tokenAddressRaw);
  const userBreakdown = await getUserBreakdown(chainId, tokenAddress);
  validateUserBreakdown(userBreakdown);
  await exportUserBreakdown(userBreakdown);
}

main().catch(console.error);
