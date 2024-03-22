# third-party-points-helper

This is a tool to query the breakdown for how much of the given input token each user owns indirectly through their participation in Poolside (Buttonswap).
This facilitates crediting third party points rewards to users that own the appropriate tokens.

Third parties can either run this directly and use the output, or use it as a reference for implementing the same logic in their own tooling.

## Setup

Requires node.js 20.0.0+ and yarn 3

1. Install dependencies: `yarn install`
2. Build typescript: `yarn build`
3. Configure `.env` file
   1. duplicate `.env.example`
   2. add an infura project ID

## Usage

Run the following command:

```
yarn start -- <chainId> <tokenAddress>
```

e.g. to query user ownership of WETH on ethereum mainnet:

```
yarn start -- 1 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

## Output

Output files are saved to `/output/user-breakdown-<chainId>-<inputTokenAddress>-<timestamp>.json`

### Output structure:

(example uses `yarn start  -- 43114 0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE`)

```json
{
  "chainId": 43114,
  "inputTokenAddress": "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
  "timestamp": 1711088238062,
  "breakdown": {
    "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE": {},
    "0xA38Bfa13bEEf9beb75F3698B4647F027fbe8f61D": {
      "0x04A150a5002CcD347d322ce11b136e64f6e28e69": {
        "liquidityTokenTotalSupply": "1919823819613423938895",
        "tokenBalance": "1952863939270137595545",
        "equivalentInputTokenBalance": "1716525606691767385023",
        "wrapper": "button",
        "users": {
          "0x0342BF051724C2697362a3B947E170B4BEA63299": {
            "liquidityTokenBalance": "233444986891924539128",
            "computedTokenBalance": "237462569245768986708",
            "computedEquivalentInputTokenBalance": "208724516104035189776"
          },
          ...
        }
      },
      "0xecf524ef92AA56d1A07780550Bf774D72Efefd5f": {
         ...
      }
    }
  }
}
```

Here the input chain and token are Avalanche and sAVAX, a non-rebasing staked AVAX token.

We see that `breakdown['0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE']` is an empty map.
This indicates that there are actually no pairs that use sAVAX directly.

Instead, we see `breakdown['0xA38..61D']` has data.
`0xA38..61D` is rsAVAX and uses the "button" wrapper, which transforms some portion of price volatility into supply changes.
In this particular case, rsAVAX rebases such that 1 rsAVAX can be redeemed for an amount of sAVAX that can itself be redeemed for 1 AVAX.

There are two entries here, `0x04A..e69` and `0xecf..d5f`.
These are the ButtonswapPair contract instances that represent a swap pair.
They are also the liquidity token addresses.
The addresses for the other tokens in these pairs are not included in this data.

Within `breakdown['0xA38..61D']['0x04A..e69']` we have the following values:

- `liquidityTokenTotalSupply`: the total amount of liquidity tokens that exist for `0x04A..e69`
- `tokenBalance`: how many `0xA38..61D` tokens the pair has at that moment
- `equivalentInputTokenBalance`: this is only present if the pair uses a wrapped version of the input token, rather than the input token itself. In the current example this value is the amount of sAVAX `0x2b2..4bE` that `tokenBalance` rsAVAX can be unwrapped for

Finally, we have `breakdown['0xA38..61D']['0x04A..e69'].users` which maps the user's address to the following values:

- `liquidityTokenBalance`: the amount of liquidity tokens (`0x04A..e69`) that the user has a claim to, either held directly on in vaults they own
- `computedTokenBalance`: this is calculated with integer math rounding as $computedTokenBalance = tokenBalance \cdot {liquidityTokenBalance \over liquidityTokenTotalSupply }$
- `computedEquivalentInputTokenBalance`: similarly not always present. This is calculated with integer math rounding as $computedEquivalentInputTokenBalance = equivalentInputTokenBalance \cdot {liquidityTokenBalance \over liquidityTokenTotalSupply }$

### Zero Address

As part of Buttonswap's design, 1000 liquidity tokens are sent to the `0x0` address when a pair is first initialised for security reasons.
Users may also "burn" liquidity tokens by sending them to this address of their own volition.

The liquidity tokens held by the zero address remain stuck forever, and as such we don't track them.
This manifests in the output above with the `liquidityTokenTotalSupply` excluding the zero address liquidity token balance.
This, in effect, proportionately distributes ownership of the underlying input token that the zero address has a claim on to all the other users.

### Using the output

The data breaks down user balances per pair.
This is because liquidity token balances cannot be valued equally between pairs, as the ratio of liquidity token to underlying input token differs from one to another.

The liquidity token balances are included for any third parties that wish to handle the conversion to underlying input token themselves.
Nevertheless, the underlying input token balances should be aggregated for users across all the pair breakdowns to get the final amount of the token that a given user owns at the time of snapshot.

### Validation

This tool applies basic validation to the generated data, exiting with an error before saving the data if validation fails.

The checks are:

- that summing the user `liquidityTokenBalance` values precisely equals the pair's `liquidityTokenTotalSupply` value
- that summing the user `computedTokenBalance` values is within error margin of the pair's `tokenBalance` value
- that summing the user `computedEquivalentInputTokenBalance` values is within error margin of the pair's `equivalentInputTokenBalance` value

The error margin for computed values is +- user count, and simply accounts for the maximum possible cumulative integer rounding errors.

It is expected to be infrequent, but it is possible that validation fails due to recent chain activity that results in a mismatch between results from chain queries and subgraph queries.
If this is encountered, running the tool again shortly after the failed attempt is likely to succeed after both data sources reach parity again.

## Methodology

1. Check the [Buttonwood Wrapper Map](https://github.com/buttonwood-protocol/buttonwood-token-list/blob/main/dist/buttonwood.wrappermap.json) to see if the input token has any wrapped versions
2. For the raw input token and all found wrapper tokens query the subgraph for all Buttonswap pairs that use one of these tokens
3. For all of these pairs query liquidity balances and corresponding user addresses
4. Query the subgraph for all vaults and their current owners
5. Query chain for input token balance held by the pair address
   1. Query chain to convert from wrapped token amount to underlying input token amount where appropriate
6. Use this data to compute final breakdown of how much input token each user owns at this point in time
