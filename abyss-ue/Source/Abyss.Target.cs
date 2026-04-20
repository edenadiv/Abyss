using UnrealBuildTool;
using System.Collections.Generic;

public class AbyssTarget : TargetRules
{
    public AbyssTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("Abyss");

        // UE 5.7 on macOS compiles Apple Silicon binaries by default when
        // running on an ARM Mac — no explicit flag required.

        if (Target.Configuration == UnrealTargetConfiguration.Shipping)
        {
            bAllowLTCG = true;
            bUseChecksInShipping = false;
            bUseLoggingInShipping = false;
        }
    }
}
