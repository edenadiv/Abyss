#include "AbyssCoin.h"

FAbyssCoinResult UAbyssCoin::Flip(EAbyssCoinFace Call, int32 Bet, float EdgeBias)
{
    FAbyssCoinResult R;
    const float WinProb = FMath::Clamp(0.5f * EdgeBias, 0.f, 1.f);
    R.bWon = FMath::FRand() < WinProb;
    R.Actual = R.bWon ? Call : (Call == EAbyssCoinFace::Heads ? EAbyssCoinFace::Tails : EAbyssCoinFace::Heads);
    R.Delta = R.bWon ? Bet : -Bet;
    return R;
}
