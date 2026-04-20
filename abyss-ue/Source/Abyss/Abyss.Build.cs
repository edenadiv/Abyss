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
            "OnlineSubsystemSteam",
            "MoviePlayer",
        });

        PrivateDependencyModuleNames.AddRange(new string[] { });

        DynamicallyLoadedModuleNames.Add("OnlineSubsystemSteam");

        bEnableExceptions = false;
    }
}
