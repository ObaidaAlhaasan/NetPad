using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NetPad.Common;

namespace NetPad.Plugins.OmniSharp.Features.Common.FileOperation;

// Only used for NSwag
[Newtonsoft.Json.JsonConverter(typeof(NJsonSchema.Converters.JsonInheritanceConverter), "discriminator")]

[JsonConverter(typeof(JsonInheritanceConverter<FileOperationResponse>))]
[KnownType(typeof(ModifiedFileResponse))]
[KnownType(typeof(OpenFileResponse))]
[KnownType(typeof(RenamedFileResponse))]
public abstract class FileOperationResponse
{
    public FileOperationResponse(string fileName, OmniSharpFileModificationType type)
    {
        FileName = fileName;
        ModificationType = type;
    }

    public string FileName { get; }

    public OmniSharpFileModificationType ModificationType { get; }
}

public class ModifiedFileResponse : FileOperationResponse
{
    public ModifiedFileResponse(string fileName)
        : base(fileName, OmniSharpFileModificationType.Modified)
    {
    }

    public string Buffer { get; set; }
    public IEnumerable<OmniSharpLinePositionSpanTextChange> Changes { get; set; }
}

public class OpenFileResponse : FileOperationResponse
{
    public OpenFileResponse(string fileName) : base(fileName, OmniSharpFileModificationType.Opened)
    {
    }
}

public class RenamedFileResponse : FileOperationResponse
{
    public RenamedFileResponse(string fileName, string newFileName)
        : base(fileName, OmniSharpFileModificationType.Renamed)
    {
        NewFileName = newFileName;
    }

    public string NewFileName { get; }
}
