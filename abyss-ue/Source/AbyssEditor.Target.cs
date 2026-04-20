using UnrealBuildTool;
using System.Collections.Generic;

public class AbyssEditorTarget : TargetRules
{
    public AbyssEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("Abyss");
    }
}
