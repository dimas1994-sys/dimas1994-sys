namespace GameConstructor2D.Models;

public sealed class GameTemplate
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public IReadOnlyList<string> Includes { get; init; } = Array.Empty<string>();
}
