using UnrealBuildTool;

public class Abyss : ModuleRules
{
    public Abyss(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "UMG",
            "Slate",
            "SlateCore",
            "Json",
            "JsonUtilities",
            "OnlineSubsystem",
            "MoviePlayer",
        });

        PrivateDependencyModuleNames.AddRange(new string[] { });

        // OnlineSubsystemSteam is dynamically loaded — we interact through
        // IOnlineSubsystem::Get(STEAM_SUBSYSTEM) without a hard link.
        DynamicallyLoadedModuleNames.Add("OnlineSubsystemSteam");

        bEnableExceptions = false;
    }
}
