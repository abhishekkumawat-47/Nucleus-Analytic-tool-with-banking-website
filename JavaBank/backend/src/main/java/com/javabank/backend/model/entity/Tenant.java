package com.javabank.backend.model.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "\"Tenant\"")
public class Tenant {
    @Id
    private String id;

    private String name;
    private String ifscPrefix;
    private String branchCode;
}
