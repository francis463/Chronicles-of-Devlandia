# Hosted chests — design

The free-standing code-chest drawings go away. Each chest now lives inside a landmark; the landmark is the chest (press `E` or tap it). Chest ids, question banks, badges (11) and the database are unchanged.

| Chest | Landmark | Zone |
|---|---|---|
| HTML | Ski Lodge | Peaks |
| CSS | Ice Cave (north, behind the gate) | Peaks |
| PHP | Hut | Dev Village |
| SQL | Windmill | Dev Village |
| C# | Archive (unchanged) | Dev Village |
| JavaScript | Old Oak | Dense Forest |
| Java | Pyramid | Sunbaked Desert |
| Python II | Oasis | Sunbaked Desert |
| C++ II | Shipwreck | Sunny Beach |
| C++ I | Pier | Sunny Beach |
| Python I | Ruins | Foggaten Island |

- The landmark's own inspect place (old oak, ruins, pyramid, oasis, shipwreck, pier) is replaced by the chest place with the landmark's name; its verb is `Search <Landmark>` / `Review <Landmark>`, its card is the chest card, its caption shows `✓` once earned. The chest sprite and the C# doorway chest are no longer drawn.
- The gate still guards what is north of the wall (the Ice Cave chest, the Supply Cache, the tower). `/ping <chest>` points at the landmark; the pings `pyramid`, `oasis`, `jetty`, `shipwreck` go (chest pings `java`, `py2`, `cpp1`, `cpp2` replace them).
- Foggaten Island and the desert and beach get chests, so their README notes change.
