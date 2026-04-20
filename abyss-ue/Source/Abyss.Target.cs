using UnrealBuildTool;
using System.Collections.Generic;

public class AbyssTarget : TargetRules
{
    public AbyssTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("Abyss");

        // --- Apple Silicon / M4 Max ---
        if (Target.Platform == UnrealTargetPlatform.Mac)
        {
            // ARM64-only build. Smaller .app, faster launch — no x86_64 slice
            // we'd never run on your M-series Mac.
            MacPlatform.bUseApplicationSilicon = true;

            // Thin LTO in Shipping — real perf bump, link stays fast.
            bAllowLTCG = Target.Configuration == UnrealTargetConfiguration.Shipping;
            bPreferThinLTO = true;
        }

        // Shipping: strip checks + logs. Smaller + faster + harder to debug
        // post-ship, which is the right tradeoff once we're past QA.
        if (Target.Configuration == UnrealTargetConfiguration.Shipping)
        {
            bUseChecksInShipping = false;
            bUseLoggingInShipping = false;
        }
    }
}
