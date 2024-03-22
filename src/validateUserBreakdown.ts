import { UserBreakdown } from './getUserBreakdown.ts';

export function validateUserBreakdown(userBreakdown: UserBreakdown) {
  for (const tokenAddress of Object.keys(userBreakdown.breakdown)) {
    const tokenUserBreakdown = userBreakdown.breakdown[tokenAddress];
    for (const pairAddress of Object.keys(tokenUserBreakdown)) {
      const pairUserBreakdown = tokenUserBreakdown[pairAddress];
      const {
        liquidityTokenTotalSupply,
        tokenBalance,
        equivalentInputTokenBalance,
      } = pairUserBreakdown;

      let liquidityTokenBalanceSum = 0n;
      let computedTokenBalanceSum = 0n;
      let computedEquivalentInputTokenBalanceSum = 0n;
      for (const {
        liquidityTokenBalance,
        computedTokenBalance,
        computedEquivalentInputTokenBalance,
      } of Object.values(pairUserBreakdown.users)) {
        liquidityTokenBalanceSum += liquidityTokenBalance;
        computedTokenBalanceSum += computedTokenBalance;
        if (computedEquivalentInputTokenBalance) {
          computedEquivalentInputTokenBalanceSum +=
            computedEquivalentInputTokenBalance;
        }
      }

      if (liquidityTokenBalanceSum !== liquidityTokenTotalSupply) {
        console.log(pairUserBreakdown);
        throw new Error(
          `liquidityTokenBalance values do not sum to liquidityTokenTotalSupply for pair ${pairAddress}: ${liquidityTokenBalanceSum} !== ${liquidityTokenTotalSupply}`,
        );
      }

      // Integer rounding means the computed sum can be out by up to plus or minus 1 for each summed value, aka the number of users
      const computedErrorTolerance = BigInt(
        Object.values(pairUserBreakdown.users).length,
      );
      if (
        computedTokenBalanceSum < tokenBalance - computedErrorTolerance ||
        computedTokenBalanceSum > tokenBalance + computedErrorTolerance
      ) {
        console.log(pairUserBreakdown);
        throw new Error(
          `computedTokenBalanceSum values do not sum to tokenBalance for pair ${pairAddress}: ${computedTokenBalanceSum} !== ${tokenBalance}`,
        );
      }
      if (
        equivalentInputTokenBalance &&
        (computedEquivalentInputTokenBalanceSum <
          equivalentInputTokenBalance - computedErrorTolerance ||
          computedEquivalentInputTokenBalanceSum >
            equivalentInputTokenBalance + computedErrorTolerance)
      ) {
        console.log(pairUserBreakdown);
        throw new Error(
          `computedEquivalentInputTokenBalanceSum values do not sum to equivalentInputTokenBalance for pair ${pairAddress}: ${computedEquivalentInputTokenBalanceSum} !== ${equivalentInputTokenBalance}`,
        );
      }
    }
  }
  console.log('Validated!');
}
