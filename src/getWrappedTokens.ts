import { fetch } from 'cross-fetch';
import { ChainId } from './chains.ts';

export interface WrapperPair {
  readonly unwrapped: string;
  readonly wrapped: string;
  readonly chainId: number;
}

export interface WrapperMapWrappers {
  [key: string]: WrapperPair[];
}

export interface WrapperMap {
  wrappers: WrapperMapWrappers;
}

export type WrapperType = 'button' | 'unbutton';

export interface WrappedToken {
  wrapper: WrapperType;
  chainId: ChainId;
  unwrapped: string;
  wrapped: string;
}

const wrapperTypes: WrapperType[] = ['button', 'unbutton'];

export async function getWrappedTokens(
  chainId: ChainId,
  tokenAddress: string,
): Promise<WrappedToken[]> {
  console.log(`Fetching wrappermap...`);
  const res = await fetch(
    'https://buttonwood-protocol.github.io/buttonwood-token-list/dist/buttonwood.wrappermap.json',
  );
  const wrapperMap = (await res.json()) as WrapperMap;

  return wrapperTypes.flatMap((wrapper) => {
    return wrapperMap.wrappers[wrapper]
      .filter((token) => {
        return token.chainId === chainId && token.unwrapped === tokenAddress;
      })
      .map((token) => {
        return {
          wrapper,
          chainId: chainId,
          unwrapped: tokenAddress,
          wrapped: token.wrapped,
        };
      });
  });
}
