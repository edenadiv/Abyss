#include "AbyssBaccarat.h"

FAbyssBacResult UAbyssBaccarat::Play(EAbyssBacBet Bet, int32 Amount, float EdgeBias)
{
    FAbyssBacResult R;
    // Distribution: Player ~44.6 %, Banker ~45.8 %, Tie ~9.6 %.
    const float Roll = FMath::FRand();
    const float PlayerEdge = 0.446f * EdgeBias;
    const float BankerEdge = PlayerEdge + 0.458f;
    if (Roll < PlayerEdge)      R.Outcome = EAbyssBacBet::Player;
    else if (Roll < BankerEdge) R.Outcome = EAbyssBacBet::Banker;
    else                        R.Outcome = EAbyssBacBet::Tie;

    R.PlayerScore = FMath::RandRange(0, 9);
    R.BankerScore = FMath::RandRange(0, 9);

    if (Bet == R.Outcome)
    {
        if (R.Outcome == EAbyssBacBet::Tie)    R.Delta = Amount * 8;
        else if (R.Outcome == EAbyssBacBet::Banker) R.Delta = FMath::RoundToInt(Amount * 0.95f);
        else                                        R.Delta = Amount;
    }
    else
    {
        // Tie is a push for Player/Banker bets.
        R.Delta = (R.Outcome == EAbyssBacBet::Tie && Bet != EAbyssBacBet::Tie) ? 0 : -Amount;
    }
    return R;
}
