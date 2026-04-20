#include "AbyssDice.h"

FAbyssDiceResult UAbyssDice::Roll(EAbyssDiceCall Call, int32 Bet)
{
    FAbyssDiceResult R;
    R.Die1 = FMath::RandRange(1, 6);
    R.Die2 = FMath::RandRange(1, 6);
    R.Total = R.Die1 + R.Die2;
    switch (Call)
    {
        case EAbyssDiceCall::Under7: R.bWon = R.Total < 7; R.Delta = R.bWon ? Bet : -Bet; break;
        case EAbyssDiceCall::Seven:  R.bWon = R.Total == 7; R.Delta = R.bWon ? Bet * 4 : -Bet; break;
        case EAbyssDiceCall::Over7:  R.bWon = R.Total > 7; R.Delta = R.bWon ? Bet : -Bet; break;
    }
    return R;
}
