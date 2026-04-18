namespace GameConstructor2D.Models;

public sealed class ResourceAsset
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}
