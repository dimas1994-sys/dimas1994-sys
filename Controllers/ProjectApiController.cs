using GameConstructor2D.Services;
using Microsoft.AspNetCore.Mvc;

namespace GameConstructor2D.Controllers;

[ApiController]
[Route("api/workspace")]
public sealed class ProjectApiController(ProjectWorkspaceService service) : ControllerBase
{
    [HttpGet("templates")]
    public IActionResult Templates() => Ok(service.GetTemplates());

    [HttpGet("resources")]
    public IActionResult Resources() => Ok(service.GetResources());

    [HttpPost("resources")]
    public IActionResult AddResource([FromBody] CreateResourceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Type))
        {
            return BadRequest("Name and Type are required.");
        }

        var created = service.AddResource(request.Name.Trim(), request.Type.Trim(), request.Path.Trim());
        return Ok(created);
    }

    [HttpGet("nodes")]
    public IActionResult Nodes() => Ok(service.GetNodes());

    [HttpPost("nodes")]
    public IActionResult AddNode([FromBody] CreateNodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest("Title is required.");
        }

        var created = service.AddNode(request.Title.Trim(), request.Category.Trim());
        return Ok(created);
    }

    public sealed record CreateResourceRequest(string Name, string Type, string Path);
    public sealed record CreateNodeRequest(string Title, string Category);
}
