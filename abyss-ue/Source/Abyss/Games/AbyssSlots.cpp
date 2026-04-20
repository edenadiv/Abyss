#include "AbyssSlots.h"

FAbyssSlotsResult UAbyssSlots::Pull(int32 Bet, float EdgeBias)
{
    FAbyssSlotsResult R;
    R.Reel1 = static_cast<EAbyssGlyph>(FMath::RandRange(0, 5));
    R.Reel2 = static_cast<EAbyssGlyph>(FMath::RandRange(0, 5));
    R.Reel3 = static_cast<EAbyssGlyph>(FMath::RandRange(0, 5));

    // Intentional bias: occasionally force a triple or pair based on EdgeBias.
    if (FMath::FRand() < 0.035f * EdgeBias)
    {
        R.Reel2 = R.Reel1; R.Reel3 = R.Reel1;
    }
    else if (FMath::FRand() < 0.18f * EdgeBias)
    {
        R.Reel2 = R.Reel1; // pair for a break-even push
    }

    if (R.Reel1 == R.Reel2 && R.Reel2 == R.Reel3) { R.Delta = Bet * 10; R.bWon = true; R.Label = TEXT("TRIPLE"); }
    else if (R.Reel1 == R.Reel2 || R.Reel2 == R.Reel3 || R.Reel1 == R.Reel3) { R.Delta = 0; R.Label = TEXT("PAIR · break even"); }
    else { R.Delta = -Bet; R.Label = TEXT("LOST"); }
    return R;
}
