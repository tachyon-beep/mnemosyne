# Knowledge Graph Design for MCP Persistence System

## Overview

This document outlines a pragmatic knowledge graph implementation using SQLite that enables cross-conversation intelligence without the complexity of dedicated graph databases. The design leverages SQLite's native capabilities including JSON1 extension, recursive CTEs, and optimized indexing.

## Design Principles

1. **SQLite-Native**: Use SQLite's built-in features rather than external graph databases
2. **Pragmatic Complexity**: Balance functionality with maintainability for desktop use
3. **Performance First**: Optimize for common query patterns in desktop scenarios
4. **Incremental**: Build on existing schema without major structural changes
5. **Privacy-Preserving**: All processing remains local

## Database Schema Extensions

### New Tables for Knowledge Graph

```sql
-- Entities table: Central entity registry
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('person', 'organization', 'product', 'concept', 'location', 'technical', 'event', 'decision')),
    canonical_form TEXT, -- For entity resolution
    confidence_score REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}', -- JSON: {aliases: [], description: "", properties: {}}
    mention_count INTEGER DEFAULT 0,
    last_mentioned_at INTEGER
);

-- Entity mentions: Links entities to specific messages
CREATE TABLE entity_mentions (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL, -- Denormalized for performance
    mention_text TEXT NOT NULL, -- Actual text that was matched
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    confidence_score REAL DEFAULT 1.0,
    extraction_method TEXT DEFAULT 'pattern', -- 'pattern', 'nlp', 'manual'
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Entity relationships: How entities relate to each other
CREATE TABLE entity_relationships (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'works_for', 'created_by', 'discussed_with', 'related_to', 'part_of'
    strength REAL DEFAULT 0.5, -- 0.0 to 1.0, calculated from co-occurrence
    first_mentioned_at INTEGER NOT NULL,
    last_mentioned_at INTEGER NOT NULL,
    mention_count INTEGER DEFAULT 1,
    context_messages TEXT DEFAULT '[]', -- JSON array of recent message IDs providing context
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Conversation topics: High-level topic extraction per conversation
CREATE TABLE conversation_topics (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.5,
    message_count INTEGER DEFAULT 1,
    first_message_id TEXT,
    last_message_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (first_message_id) REFERENCES messages(id),
    FOREIGN KEY (last_message_id) REFERENCES messages(id)
);

-- Entity evolution: Track how understanding of entities changes over time
CREATE TABLE entity_evolution (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    evolution_type TEXT NOT NULL CHECK (evolution_type IN ('property_added', 'relationship_added', 'description_updated', 'status_changed')),
    previous_value TEXT,
    new_value TEXT,
    evidence_message_id TEXT,
    confidence_score REAL DEFAULT 0.5,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_message_id) REFERENCES messages(id)
);
```

### Performance Indexes

```sql
-- Entity indexes
CREATE INDEX idx_entities_name ON entities(normalized_name);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_mentions ON entities(mention_count DESC);
CREATE INDEX idx_entities_updated ON entities(updated_at DESC);

-- Entity mention indexes
CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_mentions_message ON entity_mentions(message_id);
CREATE INDEX idx_mentions_conversation ON entity_mentions(conversation_id);
CREATE INDEX idx_mentions_confidence ON entity_mentions(confidence_score DESC);
CREATE INDEX idx_mentions_position ON entity_mentions(message_id, start_position);

-- Relationship indexes
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);
CREATE INDEX idx_relationships_strength ON entity_relationships(strength DESC);
CREATE INDEX idx_relationships_time ON entity_relationships(last_mentioned_at DESC);
CREATE INDEX idx_relationships_bidirectional ON entity_relationships(target_entity_id, source_entity_id);

-- Topic indexes
CREATE INDEX idx_topics_conversation ON conversation_topics(conversation_id);
CREATE INDEX idx_topics_name ON conversation_topics(topic_name);
CREATE INDEX idx_topics_confidence ON conversation_topics(confidence_score DESC);

-- Evolution indexes
CREATE INDEX idx_evolution_entity ON entity_evolution(entity_id, created_at DESC);
CREATE INDEX idx_evolution_conversation ON entity_evolution(conversation_id);
CREATE INDEX idx_evolution_type ON entity_evolution(evolution_type);
```

## Optimized Query Patterns

### 1. Find All Entities Connected to Entity X within N Degrees

```sql
-- Using recursive CTE for graph traversal (up to 3 degrees)
WITH RECURSIVE entity_graph(entity_id, target_id, path, degree, relationship_type, strength) AS (
  -- Base case: direct relationships
  SELECT 
    r.source_entity_id as entity_id,
    r.target_entity_id as target_id,
    r.source_entity_id || '->' || r.target_entity_id as path,
    1 as degree,
    r.relationship_type,
    r.strength
  FROM entity_relationships r
  WHERE r.source_entity_id = ?
  
  UNION ALL
  
  -- Recursive case: extend path
  SELECT 
    eg.entity_id,
    r.target_entity_id as target_id,
    eg.path || '->' || r.target_entity_id as path,
    eg.degree + 1,
    r.relationship_type,
    r.strength * eg.strength as strength -- Decay strength over distance
  FROM entity_graph eg
  JOIN entity_relationships r ON eg.target_id = r.source_entity_id
  WHERE eg.degree < ? -- Max degrees parameter
    AND instr(eg.path, r.target_entity_id) = 0 -- Prevent cycles
)
SELECT 
  e.name,
  e.type,
  eg.degree,
  eg.relationship_type,
  eg.strength,
  eg.path
FROM entity_graph eg
JOIN entities e ON eg.target_id = e.id
ORDER BY eg.degree ASC, eg.strength DESC;
```

### 2. Get Shortest Path Between Two Entities

```sql
-- Bidirectional shortest path using recursive CTE
WITH RECURSIVE forward_paths(entity_id, target_id, path_ids, path_names, distance, total_strength) AS (
  -- Forward search from source
  SELECT 
    r.source_entity_id,
    r.target_entity_id,
    json_array(r.source_entity_id, r.target_entity_id) as path_ids,
    json_array(e1.name, e2.name) as path_names,
    1 as distance,
    r.strength as total_strength
  FROM entity_relationships r
  JOIN entities e1 ON r.source_entity_id = e1.id
  JOIN entities e2 ON r.target_entity_id = e2.id
  WHERE r.source_entity_id = ?
  
  UNION ALL
  
  SELECT 
    fp.entity_id,
    r.target_entity_id,
    json_insert(fp.path_ids, '$[#]', r.target_entity_id) as path_ids,
    json_insert(fp.path_names, '$[#]', e.name) as path_names,
    fp.distance + 1,
    fp.total_strength * r.strength
  FROM forward_paths fp
  JOIN entity_relationships r ON fp.target_id = r.source_entity_id
  JOIN entities e ON r.target_entity_id = e.id
  WHERE fp.distance < 4 -- Max path length
    AND json_extract(fp.path_ids, '$') NOT LIKE '%' || r.target_entity_id || '%'
)
SELECT 
  path_names,
  distance,
  total_strength,
  path_ids
FROM forward_paths
WHERE target_id = ? -- Target entity
ORDER BY distance ASC, total_strength DESC
LIMIT 1;
```

### 3. Identify Entity Clusters/Communities

```sql
-- Find entity clusters using co-occurrence patterns
WITH entity_connections AS (
  SELECT 
    r.source_entity_id,
    r.target_entity_id,
    r.strength,
    COUNT(DISTINCT em1.conversation_id) as shared_conversations
  FROM entity_relationships r
  JOIN entity_mentions em1 ON r.source_entity_id = em1.entity_id
  JOIN entity_mentions em2 ON r.target_entity_id = em2.entity_id 
    AND em1.conversation_id = em2.conversation_id
  WHERE r.strength > 0.3 -- Minimum relationship strength
  GROUP BY r.source_entity_id, r.target_entity_id, r.strength
  HAVING shared_conversations >= 2 -- Must appear together in multiple conversations
),
entity_clusters AS (
  SELECT 
    source_entity_id as entity_id,
    COUNT(DISTINCT target_entity_id) as connection_count,
    AVG(strength) as avg_strength,
    GROUP_CONCAT(target_entity_id) as connected_entities
  FROM entity_connections
  GROUP BY source_entity_id
  HAVING connection_count >= 3 -- Minimum cluster size
)
SELECT 
  e.name as entity_name,
  e.type,
  ec.connection_count,
  ec.avg_strength,
  json_group_array(
    json_object(
      'name', connected_e.name,
      'type', connected_e.type,
      'strength', conn.strength
    )
  ) as cluster_members
FROM entity_clusters ec
JOIN entities e ON ec.entity_id = e.id
JOIN entity_connections conn ON ec.entity_id = conn.source_entity_id
JOIN entities connected_e ON conn.target_entity_id = connected_e.id
GROUP BY ec.entity_id, e.name, e.type, ec.connection_count, ec.avg_strength
ORDER BY ec.avg_strength DESC, ec.connection_count DESC;
```

### 4. Track Relationship Strength Over Time

```sql
-- Analyze how relationship strength changes over time
WITH relationship_timeline AS (
  SELECT 
    r.source_entity_id,
    r.target_entity_id,
    r.relationship_type,
    r.strength,
    DATE(r.first_mentioned_at / 1000, 'unixepoch') as first_date,
    DATE(r.last_mentioned_at / 1000, 'unixepoch') as last_date,
    r.mention_count,
    -- Calculate time-based decay
    CASE 
      WHEN (unixepoch('now') * 1000 - r.last_mentioned_at) > 86400000 * 30 -- 30 days
      THEN r.strength * 0.8 -- Decay old relationships
      ELSE r.strength
    END as adjusted_strength
  FROM entity_relationships r
  WHERE r.source_entity_id = ? OR r.target_entity_id = ?
)
SELECT 
  e1.name as source_entity,
  e2.name as target_entity,
  rt.relationship_type,
  rt.strength as original_strength,
  rt.adjusted_strength,
  rt.mention_count,
  rt.first_date,
  rt.last_date,
  CAST((unixepoch('now') - unixepoch(rt.last_date)) / 86400.0 AS INTEGER) as days_since_last_mention
FROM relationship_timeline rt
JOIN entities e1 ON rt.source_entity_id = e1.id
JOIN entities e2 ON rt.target_entity_id = e2.id
ORDER BY rt.adjusted_strength DESC, rt.mention_count DESC;
```

## Materialized Views for Performance

### Entity Summary View

```sql
-- Create a view for entity summaries (can be materialized as a table)
CREATE VIEW entity_summary AS
SELECT 
  e.id,
  e.name,
  e.type,
  e.mention_count,
  COUNT(DISTINCT em.conversation_id) as conversation_count,
  COUNT(DISTINCT r1.target_entity_id) + COUNT(DISTINCT r2.source_entity_id) as relationship_count,
  MAX(em.created_at) as last_mentioned_at,
  MIN(em.created_at) as first_mentioned_at,
  AVG(em.confidence_score) as avg_confidence,
  json_group_array(DISTINCT ct.topic_name) as associated_topics
FROM entities e
LEFT JOIN entity_mentions em ON e.id = em.entity_id
LEFT JOIN entity_relationships r1 ON e.id = r1.source_entity_id
LEFT JOIN entity_relationships r2 ON e.id = r2.target_entity_id
LEFT JOIN conversation_topics ct ON em.conversation_id = ct.conversation_id
GROUP BY e.id, e.name, e.type, e.mention_count;
```

### Conversation Entity Network View

```sql
-- View showing entity networks per conversation
CREATE VIEW conversation_entity_networks AS
SELECT 
  c.id as conversation_id,
  c.title,
  COUNT(DISTINCT em.entity_id) as entity_count,
  json_group_array(
    json_object(
      'entity_id', e.id,
      'name', e.name,
      'type', e.type,
      'mentions', em_counts.mention_count
    )
  ) as entities,
  AVG(em.confidence_score) as avg_confidence
FROM conversations c
JOIN entity_mentions em ON c.id = em.conversation_id
JOIN entities e ON em.entity_id = e.id
JOIN (
  SELECT entity_id, conversation_id, COUNT(*) as mention_count
  FROM entity_mentions
  GROUP BY entity_id, conversation_id
) em_counts ON em.entity_id = em_counts.entity_id 
  AND em.conversation_id = em_counts.conversation_id
GROUP BY c.id, c.title;
```

## SQLite-Specific Optimizations

### 1. JSON1 Extension Usage

```sql
-- Store entity properties as JSON for flexible schema
UPDATE entities 
SET metadata = json_set(
  COALESCE(metadata, '{}'),
  '$.properties.status', 'active',
  '$.aliases', json_array('alternative_name')
)
WHERE id = ?;

-- Query entities with specific properties
SELECT * FROM entities 
WHERE json_extract(metadata, '$.properties.status') = 'active';

-- Add to aliases array
UPDATE entities 
SET metadata = json_insert(metadata, '$.aliases[#]', ?)
WHERE id = ?;
```

### 2. FTS5 Integration with Entity Search

```sql
-- Create FTS5 table for entity names and descriptions
CREATE VIRTUAL TABLE entities_fts USING fts5(
  name, 
  normalized_name, 
  description,
  content=entities,
  content_rowid=rowid
);

-- Triggers to maintain FTS index
CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, name, normalized_name, description) 
  VALUES (new.rowid, new.name, new.normalized_name, 
          json_extract(new.metadata, '$.description'));
END;

-- Combined entity and message search
SELECT DISTINCT
  'entity' as result_type,
  e.id,
  e.name,
  e.type,
  entities_fts.rank
FROM entities_fts
JOIN entities e ON entities_fts.rowid = e.rowid
WHERE entities_fts MATCH ?

UNION ALL

SELECT DISTINCT
  'message' as result_type,
  m.id,
  substr(m.content, 1, 100) as preview,
  'message' as type,
  messages_fts.rank
FROM messages_fts
JOIN messages m ON messages_fts.rowid = m.rowid
WHERE messages_fts MATCH ?

ORDER BY rank DESC;
```

### 3. Recursive CTE Optimization

```sql
-- Use PRAGMA to optimize recursive queries
PRAGMA recursive_triggers = ON;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000; -- 64MB cache for complex queries

-- Optimize recursive CTE with proper indexes and limits
WITH RECURSIVE entity_paths(source_id, target_id, path, depth, visited) AS (
  SELECT 
    source_entity_id,
    target_entity_id,
    json_array(source_entity_id, target_entity_id),
    1,
    ',' || source_entity_id || ',' || target_entity_id || ','
  FROM entity_relationships 
  WHERE source_entity_id = ?
    AND strength > 0.3 -- Filter weak relationships early
  
  UNION ALL
  
  SELECT 
    ep.source_id,
    r.target_entity_id,
    json_insert(ep.path, '$[#]', r.target_entity_id),
    ep.depth + 1,
    ep.visited || r.target_entity_id || ','
  FROM entity_paths ep
  JOIN entity_relationships r ON ep.target_id = r.source_entity_id
  WHERE ep.depth < 4 -- Reasonable depth limit
    AND r.strength > 0.2 -- Progressively lower threshold
    AND instr(ep.visited, ',' || r.target_entity_id || ',') = 0 -- Cycle detection
)
SELECT * FROM entity_paths 
WHERE target_id = ?
ORDER BY depth ASC, json_array_length(path) ASC
LIMIT 10;
```

## Performance Benchmarks and Limits

### Expected Performance Characteristics

| Operation | Expected Time | Max Reasonable Data |
|-----------|---------------|-------------------|
| Entity lookup by name | < 1ms | 100K entities |
| Find direct relationships | < 5ms | 500K relationships |
| 2-degree traversal | < 50ms | 100K entities |
| 3-degree traversal | < 200ms | 50K entities |
| Entity clustering | < 500ms | 10K entities |
| Cross-conversation search | < 100ms | 10K conversations |

### Memory Usage Estimates

- **Base schema**: ~10MB for 10K entities with 50K relationships
- **Indexes**: ~20MB additional for optimized queries  
- **FTS tables**: ~5MB per 100K entity names/descriptions
- **Working memory**: ~50MB for complex recursive queries

### Desktop Application Limits

Based on typical desktop usage patterns:

- **Maximum entities**: 100,000 (more than sufficient for personal use)
- **Maximum relationships**: 500,000 (allows for rich interconnections)
- **Maximum traversal depth**: 4 degrees (prevents performance issues)
- **Query timeout**: 1 second (maintains responsive UX)

## Integration with Existing FTS5 Search

### Hybrid Search Implementation

```sql
-- Combined entity-aware search that integrates with existing message search
WITH entity_matches AS (
  SELECT DISTINCT
    em.message_id,
    em.conversation_id,
    e.name as entity_name,
    e.type as entity_type,
    'entity_mention' as match_type,
    em.confidence_score * 2 as relevance_boost -- Boost entity matches
  FROM entity_mentions em
  JOIN entities e ON em.entity_id = e.id
  WHERE e.normalized_name LIKE '%' || lower(?) || '%'
     OR json_extract(e.metadata, '$.aliases') LIKE '%' || lower(?) || '%'
),
message_matches AS (
  SELECT 
    m.id as message_id,
    m.conversation_id,
    substr(m.content, 1, 200) as snippet,
    'content_match' as match_type,
    messages_fts.rank as relevance_boost
  FROM messages_fts
  JOIN messages m ON messages_fts.rowid = m.rowid
  WHERE messages_fts MATCH ?
)
SELECT 
  m.id,
  m.conversation_id,
  m.content,
  m.created_at,
  c.title as conversation_title,
  COALESCE(em.relevance_boost, mm.relevance_boost, 0) as relevance_score,
  COALESCE(em.match_type, mm.match_type) as match_type,
  json_group_array(
    CASE WHEN em.entity_name IS NOT NULL 
    THEN json_object('name', em.entity_name, 'type', em.entity_type)
    ELSE NULL END
  ) as mentioned_entities
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
LEFT JOIN entity_matches em ON m.id = em.message_id
LEFT JOIN message_matches mm ON m.id = mm.message_id
WHERE em.message_id IS NOT NULL OR mm.message_id IS NOT NULL
GROUP BY m.id, m.conversation_id, m.content, m.created_at, c.title
ORDER BY relevance_score DESC, m.created_at DESC
LIMIT 50;
```

### Entity-Enhanced Context Assembly

The knowledge graph integrates with the existing context assembly system:

```sql
-- Find contextually relevant messages based on entity relationships
WITH query_entities AS (
  SELECT id, name, type 
  FROM entities 
  WHERE normalized_name IN (?) -- Entities extracted from query
),
related_entities AS (
  SELECT DISTINCT
    r.target_entity_id as entity_id,
    r.strength,
    r.relationship_type
  FROM query_entities qe
  JOIN entity_relationships r ON qe.id = r.source_entity_id
  WHERE r.strength > 0.4
  
  UNION ALL
  
  SELECT DISTINCT
    r.source_entity_id as entity_id,
    r.strength,
    r.relationship_type  
  FROM query_entities qe
  JOIN entity_relationships r ON qe.id = r.target_entity_id
  WHERE r.strength > 0.4
),
entity_context_messages AS (
  SELECT DISTINCT
    m.id,
    m.conversation_id,
    m.content,
    m.created_at,
    re.strength * em.confidence_score as entity_relevance,
    e.name as related_entity_name
  FROM related_entities re
  JOIN entity_mentions em ON re.entity_id = em.entity_id
  JOIN messages m ON em.message_id = m.id
  JOIN entities e ON re.entity_id = e.id
  WHERE em.confidence_score > 0.5
)
SELECT 
  ecm.*,
  cs.summary_text,
  'entity_context' as selection_reason
FROM entity_context_messages ecm
LEFT JOIN conversation_summaries cs ON ecm.conversation_id = cs.conversation_id
  AND cs.level = 'brief'
ORDER BY ecm.entity_relevance DESC, ecm.created_at DESC
LIMIT 20;
```

## Implementation Strategy

### Phase 3A: Entity Foundation (Week 1-2)
1. Create entity tables and indexes
2. Implement basic entity extraction using existing patterns from EntityCentricStrategy
3. Create entity mention tracking
4. Basic relationship detection from co-occurrence

### Phase 3B: Graph Queries (Week 3-4)  
1. Implement recursive CTE queries for graph traversal
2. Create materialized views for performance
3. Add relationship strength calculation
4. Optimize indexes based on query patterns

### Phase 3C: Integration (Week 5-6)
1. Integrate with existing FTS5 search
2. Enhance context assembly with entity relationships
3. Add cross-conversation entity tracking
4. Create new MCP tools for knowledge graph queries

### Phase 3D: Advanced Features (Optional)
1. Entity evolution tracking
2. Topic-entity relationships
3. Temporal analysis of entity relationships
4. Entity resolution and disambiguation

## New MCP Tools for Knowledge Graph

```typescript
// New tools to expose knowledge graph functionality

interface GetEntityHistoryArgs {
  entityName: string;
  maxRelationshipDegrees?: number;
  includeEvolution?: boolean;
}

interface FindRelatedConversationsArgs {
  entities: string[];
  relationshipTypes?: string[];
  minStrength?: number;
  timeRange?: { start: number; end: number };
}

interface GetKnowledgeGraphArgs {
  centerEntity: string;
  maxDegrees: number;
  minStrength?: number;
  includeTopics?: boolean;
}

interface AnalyzeEntityEvolutionArgs {
  entityName: string;
  timeRange?: { start: number; end: number };
}
```

This design provides a robust, SQLite-native knowledge graph implementation that balances functionality with pragmatic desktop application constraints. The recursive CTEs enable sophisticated graph queries while staying within SQLite's capabilities, and the materialized views ensure good performance for common access patterns.