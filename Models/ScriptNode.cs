namespace GameConstructor2D.Models;

public sealed class ScriptNode
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<Guid> Outputs { get; set; } = new();
}
