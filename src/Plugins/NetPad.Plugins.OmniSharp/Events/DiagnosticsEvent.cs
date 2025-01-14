namespace NetPad.Plugins.OmniSharp.Events;

public class DiagnosticsEvent
{
    public DiagnosticsEvent(Guid scriptId, OmniSharpDiagnosticMessage diagnostics)
    {
        ScriptId = scriptId;
        Diagnostics = diagnostics;
    }

    public Guid ScriptId { get; }
    public OmniSharpDiagnosticMessage Diagnostics { get; }
}
