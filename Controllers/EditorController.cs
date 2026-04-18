using Microsoft.AspNetCore.Mvc;

namespace GameConstructor2D.Controllers;

public sealed class EditorController : Controller
{
    public IActionResult Index() => View();
}
