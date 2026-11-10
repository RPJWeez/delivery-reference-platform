package io.fieldsignal.incidents;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentsController {
    private final IncidentStore store;

    public IncidentsController(IncidentStore store) { this.store = store; }

    @GetMapping
    public List<IncidentStore.Incident> recent() { return store.recent(); }

    @PostMapping("/{id}/acknowledge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acknowledge(@PathVariable UUID id) {
        if (!store.acknowledge(id.toString())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
