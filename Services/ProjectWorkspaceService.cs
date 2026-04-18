using GameConstructor2D.Models;

namespace GameConstructor2D.Services;

public sealed class ProjectWorkspaceService
{
    private readonly List<ResourceAsset> _resources = new();
    private readonly List<ScriptNode> _nodes = new();

    private readonly List<GameTemplate> _templates =
    [
        new()
        {
            Name = "Платформер",
            Description = "Шаблон с камерой, физикой и 2D-персонажем.",
            Includes = ["Сцена", "Игрок", "UI", "Триггеры"]
        },
        new()
        {
            Name = "Top-Down Shooter",
            Description = "Готовая структура для игры с видом сверху.",
            Includes = ["Враги", "Снаряды", "Волны", "HUD"]
        },
        new()
        {
            Name = "Puzzle",
            Description = "Старт для логической игры с системой уровней.",
            Includes = ["Сетка", "Сохранения", "Прогресс", "Эффекты"]
        }
    ];

    public IReadOnlyList<ResourceAsset> GetResources() => _resources;

    public IReadOnlyList<ScriptNode> GetNodes() => _nodes;

    public IReadOnlyList<GameTemplate> GetTemplates() => _templates;

    public ResourceAsset AddResource(string name, string type, string path)
    {
        var resource = new ResourceAsset
        {
            Name = name,
            Type = type,
            Path = path
        };

        _resources.Add(resource);
        return resource;
    }

    public ScriptNode AddNode(string title, string category)
    {
        var node = new ScriptNode
        {
            Title = title,
            Category = category
        };

        _nodes.Add(node);
        return node;
    }
}
