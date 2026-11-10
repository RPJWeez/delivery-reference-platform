package io.fieldsignal.incidents;

import io.fieldsignal.events.ReadingRecorded;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class ReadingConsumer {
    private final IncidentStore store;
    private final JsonMapper json;

    public ReadingConsumer(IncidentStore store, JsonMapper json) { this.store = store; this.json = json; }

    @KafkaListener(topics = ReadingRecorded.TOPIC)
    public void consume(String payload) { store.accept(json.readValue(payload, ReadingRecorded.class)); }
}
