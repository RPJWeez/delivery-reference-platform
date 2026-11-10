package io.fieldsignal.ingestion;

import io.fieldsignal.events.ReadingRecorded;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/readings")
public class ReadingsController {
    private final ReadingStore store;

    public ReadingsController(ReadingStore store) { this.store = store; }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ReadingRecorded submit(@RequestBody ReadingStore.Request request) { return store.record(request); }

    @GetMapping
    public List<ReadingRecorded> recent() { return store.recent(); }
}
